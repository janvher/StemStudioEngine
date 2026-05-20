package email

import (
	"fmt"
	"os"
	"strings"
)

// EmailSender interface defines the contract for email service providers
type EmailSender interface {
	SendContactFormEmail(data ContactFormData) error
	SendPlanChangeEmail(data PlanChangeData) error
}

// ContactFormData represents the data from the contact form
type ContactFormData struct {
	Name        string
	Email       string
	Reason      string
	Platform    string
	Description string
	FileData    []byte
	FileName    string
	FileType    string
}

// PlanChangeData represents data for plan change notification emails
type PlanChangeData struct {
	RecipientEmail string
	ProductName    string
	OldCredits     int
	NewCredits     int
	ChangesSummary string
}

// EmailProvider represents supported email providers
type EmailProvider string

const (
	ProviderMailgun   EmailProvider = "mailgun"
	ProviderSES       EmailProvider = "ses"
	ProviderSendGrid  EmailProvider = "sendgrid"
)

// NewEmailService creates a new email service instance based on configuration
// Default provider is Mailgun
func NewEmailService() (EmailSender, error) {
	provider := os.Getenv("EMAIL_PROVIDER")
	if provider == "" {
		provider = string(ProviderMailgun) // Mailgun is the default
	}

	switch EmailProvider(strings.ToLower(provider)) {
	case ProviderMailgun:
		return NewMailgunService()
	case ProviderSES:
		return NewSESService()
	case ProviderSendGrid:
		return NewSendGridService()
	default:
		return nil, fmt.Errorf("unsupported email provider: %s", provider)
	}
}

// ValidateEmailFormat performs basic email validation
func ValidateEmailFormat(email string) bool {
	if email == "" {
		return false
	}

	// Basic check for @ and .
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return false
	}

	if len(parts[0]) == 0 || len(parts[1]) == 0 {
		return false
	}

	if !strings.Contains(parts[1], ".") {
		return false
	}

	return true
}
