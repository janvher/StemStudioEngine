package email

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

const sendgridAPIURL = "https://api.sendgrid.com/v3/mail/send"
const sendgridMarketingContactsURL = "https://api.sendgrid.com/v3/marketing/contacts"

// SendGridService handles sending emails via SendGrid API
type SendGridService struct {
	apiKey      string
	fromAddress string
	toAddress   string
}

type sendgridEmail struct {
	Personalizations []sendgridPersonalization `json:"personalizations"`
	From             sendgridAddress           `json:"from"`
	Subject          string                    `json:"subject"`
	Content          []sendgridContent         `json:"content"`
	Attachments      []sendgridAttachment      `json:"attachments,omitempty"`
}

type sendgridPersonalization struct {
	To []sendgridAddress `json:"to"`
}

type sendgridAddress struct {
	Email string `json:"email"`
}

type sendgridContent struct {
	Type  string `json:"type"`
	Value string `json:"value"`
}

type sendgridAttachment struct {
	Content  string `json:"content"`
	Filename string `json:"filename"`
	Type     string `json:"type"`
}

// NewSendGridService creates a new SendGrid email service instance
func NewSendGridService() (*SendGridService, error) {
	apiKey := os.Getenv("SENDGRID_API_KEY")
	fromAddress := os.Getenv("SUPPORT_EMAIL_FROM")
	toAddress := os.Getenv("SUPPORT_EMAIL_ADDRESS")

	if apiKey == "" {
		return nil, fmt.Errorf("SendGrid API key not configured")
	}

	if fromAddress == "" || toAddress == "" {
		return nil, fmt.Errorf("email addresses not configured")
	}

	return &SendGridService{
		apiKey:      apiKey,
		fromAddress: fromAddress,
		toAddress:   toAddress,
	}, nil
}

// SendContactFormEmail sends a contact form submission email via SendGrid
func (s *SendGridService) SendContactFormEmail(data ContactFormData) error {
	if data.FileData != nil && len(data.FileData) > 0 {
		return s.sendEmailWithAttachment(data)
	}
	return s.sendSimpleEmail(data)
}

// SendPlanChangeEmail sends a plan change notification to a subscriber via SendGrid.
func (s *SendGridService) SendPlanChangeEmail(data PlanChangeData) error {
	subject := "Your StemStudio plan has been updated"
	body := fmt.Sprintf("Hello,\n\n%s\n\nIf you have any questions, please contact our support team.\n\n- The StemStudio Team", data.ChangesSummary)

	payload := sendgridEmail{
		Personalizations: []sendgridPersonalization{{To: []sendgridAddress{{Email: data.RecipientEmail}}}},
		From:             sendgridAddress{Email: s.fromAddress},
		Subject:          subject,
		Content:          []sendgridContent{{Type: "text/plain", Value: body}},
	}

	return s.sendRequest(payload, 30*time.Second)
}

func (s *SendGridService) buildSubjectAndBody(data ContactFormData) (string, string) {
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
	return subject, body
}

func (s *SendGridService) sendRequest(payload sendgridEmail, timeout time.Duration) error {
	jsonBody, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal email payload: %w", err)
	}

	req, err := http.NewRequest("POST", sendgridAPIURL, bytes.NewBuffer(jsonBody))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: timeout}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusAccepted {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("sendgrid API error (status %d): %s", resp.StatusCode, string(body))
	}

	return nil
}

// sendSimpleEmail sends a plain text email without attachment
func (s *SendGridService) sendSimpleEmail(data ContactFormData) error {
	subject, body := s.buildSubjectAndBody(data)

	payload := sendgridEmail{
		Personalizations: []sendgridPersonalization{{To: []sendgridAddress{{Email: s.toAddress}}}},
		From:             sendgridAddress{Email: s.fromAddress},
		Subject:          subject,
		Content:          []sendgridContent{{Type: "text/plain", Value: body}},
	}

	return s.sendRequest(payload, 30*time.Second)
}

// sendEmailWithAttachment sends an email with file attachment
func (s *SendGridService) sendEmailWithAttachment(data ContactFormData) error {
	subject, body := s.buildSubjectAndBody(data)

	payload := sendgridEmail{
		Personalizations: []sendgridPersonalization{{To: []sendgridAddress{{Email: s.toAddress}}}},
		From:             sendgridAddress{Email: s.fromAddress},
		Subject:          subject,
		Content:          []sendgridContent{{Type: "text/plain", Value: body}},
		Attachments: []sendgridAttachment{{
			Content:  base64.StdEncoding.EncodeToString(data.FileData),
			Filename: data.FileName,
			Type:     data.FileType,
		}},
	}

	return s.sendRequest(payload, 60*time.Second)
}

// sendgridTemplateEmail is the payload for sending a dynamic template email.
type sendgridTemplateEmail struct {
	Personalizations []sendgridTemplatePersonalization `json:"personalizations"`
	From             sendgridAddress                   `json:"from"`
	TemplateID       string                            `json:"template_id"`
}

type sendgridTemplatePersonalization struct {
	To          []sendgridAddress      `json:"to"`
	DynamicData map[string]interface{} `json:"dynamic_template_data,omitempty"`
}

// SendTemplateEmail sends a dynamic template email via SendGrid.
func (s *SendGridService) SendTemplateEmail(toEmail, templateID string, dynamicData map[string]interface{}) error {
	payload := sendgridTemplateEmail{
		Personalizations: []sendgridTemplatePersonalization{{
			To:          []sendgridAddress{{Email: toEmail}},
			DynamicData: dynamicData,
		}},
		From:       sendgridAddress{Email: s.fromAddress},
		TemplateID: templateID,
	}

	jsonBody, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal template email payload: %w", err)
	}

	req, err := http.NewRequest("POST", sendgridAPIURL, bytes.NewBuffer(jsonBody))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send template email: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusAccepted {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("sendgrid API error (status %d): %s", resp.StatusCode, string(body))
	}

	return nil
}

// sendgridMarketingContact is the payload for adding contacts to a marketing list.
type sendgridMarketingContact struct {
	ListIDs  []string                       `json:"list_ids"`
	Contacts []sendgridMarketingContactData `json:"contacts"`
}

type sendgridMarketingContactData struct {
	Email string `json:"email"`
}

// AddMarketingContact adds an email to a SendGrid marketing contact list.
func (s *SendGridService) AddMarketingContact(email, listID string) error {
	payload := sendgridMarketingContact{
		ListIDs:  []string{listID},
		Contacts: []sendgridMarketingContactData{{Email: email}},
	}

	jsonBody, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal marketing contact payload: %w", err)
	}

	req, err := http.NewRequest("PUT", sendgridMarketingContactsURL, bytes.NewBuffer(jsonBody))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to add marketing contact: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusAccepted && resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("sendgrid marketing API error (status %d): %s", resp.StatusCode, string(body))
	}

	return nil
}

// NewSendGridServiceMinimal creates a SendGrid service using only API key and from address.
// Used for transactional/template emails where no support "to" address is needed.
func NewSendGridServiceMinimal() (*SendGridService, error) {
	apiKey := os.Getenv("SENDGRID_API_KEY")
	fromAddress := os.Getenv("SUPPORT_EMAIL_FROM")

	if apiKey == "" {
		return nil, fmt.Errorf("SendGrid API key not configured")
	}
	if fromAddress == "" {
		return nil, fmt.Errorf("SUPPORT_EMAIL_FROM not configured")
	}

	return &SendGridService{
		apiKey:      apiKey,
		fromAddress: fromAddress,
	}, nil
}
