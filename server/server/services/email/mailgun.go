package email

import (
	"bytes"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"os"
	"time"
)

// MailgunService handles sending emails via Mailgun API
type MailgunService struct {
	apiKey      string
	domain      string
	fromAddress string
	toAddress   string
}

// NewMailgunService creates a new Mailgun email service instance
func NewMailgunService() (*MailgunService, error) {
	apiKey := os.Getenv("MAILGUN_API_KEY")
	domain := os.Getenv("MAILGUN_DOMAIN")
	fromAddress := os.Getenv("SUPPORT_EMAIL_FROM")
	toAddress := os.Getenv("SUPPORT_EMAIL_ADDRESS")

	if apiKey == "" {
		return nil, fmt.Errorf("Mailgun API key not configured")
	}

	if domain == "" {
		return nil, fmt.Errorf("Mailgun domain not configured")
	}

	if fromAddress == "" || toAddress == "" {
		return nil, fmt.Errorf("email addresses not configured")
	}

	return &MailgunService{
		apiKey:      apiKey,
		domain:      domain,
		fromAddress: fromAddress,
		toAddress:   toAddress,
	}, nil
}

// SendContactFormEmail sends a contact form submission email via Mailgun
func (m *MailgunService) SendContactFormEmail(data ContactFormData) error {
	if data.FileData != nil && len(data.FileData) > 0 {
		return m.sendEmailWithAttachment(data)
	}
	return m.sendSimpleEmail(data)
}

// sendSimpleEmail sends a plain text email without attachment
func (m *MailgunService) sendSimpleEmail(data ContactFormData) error {
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

	// Create multipart form data
	var requestBody bytes.Buffer
	writer := multipart.NewWriter(&requestBody)

	// Add form fields
	writer.WriteField("from", m.fromAddress)
	writer.WriteField("to", m.toAddress)
	writer.WriteField("subject", subject)
	writer.WriteField("text", body)

	writer.Close()

	// Make HTTP request to Mailgun API
	url := fmt.Sprintf("https://api.mailgun.net/v3/%s/messages", m.domain)
	req, err := http.NewRequest("POST", url, &requestBody)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.SetBasicAuth("api", m.apiKey)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusAccepted {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("mailgun API error (status %d): %s", resp.StatusCode, string(body))
	}

	return nil
}

// SendPlanChangeEmail sends a plan change notification to a subscriber.
func (m *MailgunService) SendPlanChangeEmail(data PlanChangeData) error {
	subject := "Your StemStudio plan has been updated"
	body := fmt.Sprintf("Hello,\n\n%s\n\nIf you have any questions, please contact our support team.\n\n- The StemStudio Team", data.ChangesSummary)

	var requestBody bytes.Buffer
	writer := multipart.NewWriter(&requestBody)
	writer.WriteField("from", m.fromAddress)
	writer.WriteField("to", data.RecipientEmail)
	writer.WriteField("subject", subject)
	writer.WriteField("text", body)
	writer.Close()

	url := fmt.Sprintf("https://api.mailgun.net/v3/%s/messages", m.domain)
	req, err := http.NewRequest("POST", url, &requestBody)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	req.SetBasicAuth("api", m.apiKey)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusAccepted {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("mailgun API error (status %d): %s", resp.StatusCode, string(respBody))
	}
	return nil
}

// sendEmailWithAttachment sends an email with file attachment
func (m *MailgunService) sendEmailWithAttachment(data ContactFormData) error {
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

	// Create multipart form data
	var requestBody bytes.Buffer
	writer := multipart.NewWriter(&requestBody)

	// Add form fields
	writer.WriteField("from", m.fromAddress)
	writer.WriteField("to", m.toAddress)
	writer.WriteField("subject", subject)
	writer.WriteField("text", body)

	// Add file attachment
	fileHeader := textproto.MIMEHeader{}
	fileHeader.Set("Content-Disposition", fmt.Sprintf(`form-data; name="attachment"; filename="%s"`, data.FileName))
	fileHeader.Set("Content-Type", data.FileType)

	filePart, err := writer.CreatePart(fileHeader)
	if err != nil {
		return fmt.Errorf("failed to create attachment part: %w", err)
	}

	_, err = filePart.Write(data.FileData)
	if err != nil {
		return fmt.Errorf("failed to write attachment data: %w", err)
	}

	writer.Close()

	// Make HTTP request to Mailgun API
	url := fmt.Sprintf("https://api.mailgun.net/v3/%s/messages", m.domain)
	req, err := http.NewRequest("POST", url, &requestBody)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.SetBasicAuth("api", m.apiKey)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{Timeout: 60 * time.Second} // Longer timeout for attachments
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusAccepted {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("mailgun API error (status %d): %s", resp.StatusCode, string(body))
	}

	return nil
}
