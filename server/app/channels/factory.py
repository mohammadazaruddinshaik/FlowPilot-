from app.channels.twilio_whatsapp import TwilioWhatsAppChannel
from app.channels.smtp_email import SMTPEmailChannel


def get_channel(channel_type: str, integration):

    channel_type = channel_type.lower()

    if channel_type == "whatsapp":
        return TwilioWhatsAppChannel(integration)

    if channel_type == "email":
        return SMTPEmailChannel(integration)

    raise Exception(f"Unsupported channel type: {channel_type}")