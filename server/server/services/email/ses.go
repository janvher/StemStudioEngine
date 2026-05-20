package email

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"io"
	"mime/multipart"
	"net/textproto"
	"os"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/ses"
	"github.com/aws/aws-sdk-go-v2/service/ses/types"
)

// SESService handles sending emails via AWS SES
type SESService struct {
	client      *ses.Client
	fromAddress string
	toAddress   string
}

// NewSESService creates a new SES email service instance
func NewSESService() (*SESService, error) {
	region := os.Getenv("AWS_REGION")
	if region == "" {
		region = "us-east-1"
	}

	accessKeyID := os.Getenv("AWS_SES_ACCESS_KEY_ID")
	secretAccessKey := os.Getenv("AWS_SES_SECRET_ACCESS_KEY")
	fromAddress := os.Getenv("SUPPORT_EMAIL_FROM")
	toAddress := os.Getenv("SUPPORT_EMAIL_ADDRESS")

	if accessKeyID == "" || secretAccessKey == "" {
		return nil, fmt.Errorf("AWS SES credentials not configured")
	}

	if fromAddress == "" || toAddress == "" {
		return nil, fmt.Errorf("email addresses not configured")
	}

	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithRegion(region),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			accessKeyID,
			secretAccessKey,
			"",
		)),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	return &SESService{
		client:      ses.NewFromConfig(cfg),
		fromAddress: fromAddress,
		toAddress:   toAddress,
	}, nil
}

// SendContactFormEmail sends a contact form submission email
func (e *SESService) SendContactFormEmail(data ContactFormData) error {
	if data.FileData != nil && len(data.FileData) > 0 {
		return e.sendRawEmailWithAttachment(data)
	}
	return e.sendSimpleEmail(data)
}

// sendSimpleEmail sends a plain text email without attachment
func (e *SESService) sendSimpleEmail(data ContactFormData) error {
	subject := fmt.Sprintf("[%s] Contact Form: %s - %s", data.Reason, data.Name, data.Platform)

	body := fmt.Sprintf(`Name: %s
Email: %s
Reason: %s
Platform: %s

Message:
%s

---
Submitted at: %s`,
		data.Name,
		data.Email,
		data.Reason,
		data.Platform,
		data.Description,
		time.Now().UTC().Format(time.RFC3339),
	)

	input := &ses.SendEmailInput{
		Source: aws.String(e.fromAddress),
		Destination: &types.Destination{
			ToAddresses: []string{e.toAddress},
		},
		Message: &types.Message{
			Subject: &types.Content{
				Data:    aws.String(subject),
				Charset: aws.String("UTF-8"),
			},
			Body: &types.Body{
				Text: &types.Content{
					Data:    aws.String(body),
					Charset: aws.String("UTF-8"),
				},
			},
		},
	}

	_, err := e.client.SendEmail(context.TODO(), input)
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	return nil
}

// SendPlanChangeEmail sends a plan change notification to a subscriber via SES.
func (e *SESService) SendPlanChangeEmail(data PlanChangeData) error {
	subject := "Your StemStudio plan has been updated"
	body := fmt.Sprintf("Hello,\n\n%s\n\nIf you have any questions, please contact our support team.\n\n- The StemStudio Team", data.ChangesSummary)

	input := &ses.SendEmailInput{
		Source: aws.String(e.fromAddress),
		Destination: &types.Destination{
			ToAddresses: []string{data.RecipientEmail},
		},
		Message: &types.Message{
			Subject: &types.Content{Data: aws.String(subject), Charset: aws.String("UTF-8")},
			Body:    &types.Body{Text: &types.Content{Data: aws.String(body), Charset: aws.String("UTF-8")}},
		},
	}

	_, err := e.client.SendEmail(context.TODO(), input)
	if err != nil {
		return fmt.Errorf("failed to send plan change email: %w", err)
	}
	return nil
}

// sendRawEmailWithAttachment sends a MIME multipart email with attachment
func (e *SESService) sendRawEmailWithAttachment(data ContactFormData) error {
	subject := fmt.Sprintf("[%s] Contact Form: %s - %s", data.Reason, data.Name, data.Platform)

	// Create buffer for the entire email
	var emailBuf bytes.Buffer

	// Create multipart writer for the body
	bodyWriter := multipart.NewWriter(&emailBuf)
	boundary := bodyWriter.Boundary()

	// Write email headers
	emailBuf.WriteString(fmt.Sprintf("From: %s\r\n", e.fromAddress))
	emailBuf.WriteString(fmt.Sprintf("To: %s\r\n", e.toAddress))
	emailBuf.WriteString(fmt.Sprintf("Subject: %s\r\n", subject))
	emailBuf.WriteString("MIME-Version: 1.0\r\n")
	emailBuf.WriteString(fmt.Sprintf("Content-Type: multipart/mixed; boundary=\"%s\"\r\n", boundary))
	emailBuf.WriteString("\r\n")

	// Create text part
	bodyText := fmt.Sprintf(`Name: %s
Email: %s
Reason: %s
Platform: %s

Message:
%s

---
Submitted at: %s`,
		data.Name,
		data.Email,
		data.Reason,
		data.Platform,
		data.Description,
		time.Now().UTC().Format(time.RFC3339),
	)

	textPart, err := bodyWriter.CreatePart(textproto.MIMEHeader{
		"Content-Type":              []string{"text/plain; charset=UTF-8"},
		"Content-Transfer-Encoding": []string{"7bit"},
	})
	if err != nil {
		return fmt.Errorf("failed to create text part: %w", err)
	}

	_, err = textPart.Write([]byte(bodyText))
	if err != nil {
		return fmt.Errorf("failed to write text part: %w", err)
	}

	// Create attachment part
	attachmentHeader := textproto.MIMEHeader{}
	attachmentHeader.Set("Content-Type", data.FileType)
	attachmentHeader.Set("Content-Transfer-Encoding", "base64")
	attachmentHeader.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", data.FileName))

	attachmentPart, err := bodyWriter.CreatePart(attachmentHeader)
	if err != nil {
		return fmt.Errorf("failed to create attachment part: %w", err)
	}

	// Encode file data to base64 with proper line wrapping (76 chars per line)
	encoder := base64.NewEncoder(base64.StdEncoding, &base64LineWrapper{w: attachmentPart, lineLength: 76})
	_, err = encoder.Write(data.FileData)
	if err != nil {
		encoder.Close()
		return fmt.Errorf("failed to encode attachment: %w", err)
	}
	encoder.Close()

	bodyWriter.Close()

	// Send raw email
	input := &ses.SendRawEmailInput{
		RawMessage: &types.RawMessage{
			Data: emailBuf.Bytes(),
		},
	}

	_, err = e.client.SendRawEmail(context.TODO(), input)
	if err != nil {
		return fmt.Errorf("failed to send raw email: %w", err)
	}

	return nil
}

// base64LineWrapper wraps lines at specified length for base64 encoding
type base64LineWrapper struct {
	w          io.Writer
	lineLength int
	written    int
}

func (w *base64LineWrapper) Write(p []byte) (n int, err error) {
	for len(p) > 0 {
		// Calculate how much we can write before hitting line limit
		remaining := w.lineLength - w.written
		if remaining <= 0 {
			// Write newline and reset counter
			if _, err := w.w.Write([]byte("\r\n")); err != nil {
				return n, err
			}
			w.written = 0
			remaining = w.lineLength
		}

		// Write up to remaining characters
		toWrite := len(p)
		if toWrite > remaining {
			toWrite = remaining
		}

		written, err := w.w.Write(p[:toWrite])
		n += written
		w.written += written
		p = p[toWrite:]

		if err != nil {
			return n, err
		}
	}
	return n, nil
}
