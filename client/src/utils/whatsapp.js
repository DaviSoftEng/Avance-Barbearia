// Link para abrir conversa no WhatsApp (Brasil: garante o DDI 55).
// Usa api.whatsapp.com/send em vez de wa.me: o redirecionamento do wa.me corrompe os
// emojis do texto em alguns aparelhos (a mensagem chega com "�" no lugar do emoji).
export function whatsappUrl(phone, text) {
  const d = String(phone || '').replace(/\D/g, '');
  const full = d.startsWith('55') ? d : `55${d}`;
  return `https://api.whatsapp.com/send?phone=${full}${text ? `&text=${encodeURIComponent(text)}` : ''}`;
}
