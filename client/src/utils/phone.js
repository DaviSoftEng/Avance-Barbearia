// Utilitários de telefone (Brasil) — espelham a validação do backend

// Só dígitos, sem DDI 55. Ex.: "+55 (21) 98035-0062" → "21980350062"
export function normalizePhone(v) {
  let d = String(v || '').replace(/\D/g, '');
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  return d;
}

// Aplica a máscara enquanto o cliente digita: "(21) 98035-0062"
export function maskPhone(v) {
  const d = normalizePhone(v).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// Formata um número já salvo (dígitos) para exibição
export function formatPhone(v) {
  return maskPhone(v) || String(v || '');
}

// Valida telefone BR: 10 (fixo) ou 11 (celular) dígitos, DDD >= 11,
// celular começa com 9, e rejeita dígitos repetidos (2222...)
export function isValidBRPhone(v) {
  const d = normalizePhone(v);
  if (!/^\d{10,11}$/.test(d)) return false;
  if (/^(\d)\1+$/.test(d)) return false;
  if (parseInt(d.slice(0, 2), 10) < 11) return false;
  if (d.length === 11 && d[2] !== '9') return false;
  return true;
}
