// Utilitários de telefone (Brasil)

// Normaliza para apenas dígitos, no formato canônico DDD + número (sem o DDI 55).
// Ex.: "+55 (21) 98035-0062" → "21980350062"
function normalizePhone(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  return d;
}

// Valida um telefone brasileiro:
// - 10 dígitos (fixo) ou 11 dígitos (celular)
// - DDD válido (>= 11)
// - celular (11 dígitos) começa com 9 após o DDD
// - rejeita números de dígito único repetido (00000000000, 22222222222)
function isValidBRPhone(raw) {
  const d = normalizePhone(raw);
  if (!/^\d{10,11}$/.test(d)) return false;
  if (/^(\d)\1+$/.test(d)) return false;
  if (parseInt(d.slice(0, 2), 10) < 11) return false;
  if (d.length === 11 && d[2] !== '9') return false;
  return true;
}

module.exports = { normalizePhone, isValidBRPhone };
