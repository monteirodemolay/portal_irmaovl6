const SAO_PAULO_TIME_ZONE = 'America/Sao_Paulo';

function saoPauloHour(date: Date): number {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: SAO_PAULO_TIME_ZONE,
    hour: 'numeric',
    hour12: false,
  }).format(date);
  return Number(formatted) % 24;
}

/** Saudação por horário local da Loja (Brasil) — usada no cabeçalho do Início. */
export function timeOfDayGreeting(date: Date): 'Bom dia' | 'Boa tarde' | 'Boa noite' {
  const hour = saoPauloHour(date);
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}
