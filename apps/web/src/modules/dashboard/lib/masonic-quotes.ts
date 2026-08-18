import type { QuoteRotationMode } from '@vl6/shared';

export interface MasonicQuote {
  text: string;
  author: string;
}

/**
 * Banco de ~100 frases motivacionais para o Início — metade de pensadores
 * reconhecidos (atribuição honesta: "atribuída"/"parafraseando" quando a
 * autoria exata é discutida na tradição popular), metade provérbios da
 * tradição maçônica (pedra bruta, esquadro e compasso, luz e trevas —
 * sem atribuição a uma pessoa real, pois são máximas de ofício, não
 * citações). Serve de fallback em `pickQuote` enquanto o Admin não cadastra
 * nenhuma frase própria em Conteúdo → Frases.
 */
export const MASONIC_QUOTES: MasonicQuote[] = [
  { text: 'Só sei que nada sei.', author: 'Sócrates' },
  { text: 'Conhece-te a ti mesmo.', author: 'Inscrição do Oráculo de Delfos' },
  {
    text: 'Estudar sem pensar é tempo perdido; pensar sem estudar é perigoso.',
    author: 'Confúcio',
  },
  { text: 'Não importa o quão devagar você vá, desde que não pare.', author: 'Confúcio' },
  { text: 'A ignorância é a raiz e o caule de todo mal.', author: 'Platão' },
  {
    text: 'Não é porque as coisas são difíceis que não ousamos; é porque não ousamos que elas são difíceis.',
    author: 'Sêneca',
  },
  { text: 'A alma se tinge da cor dos seus pensamentos.', author: 'Marco Aurélio' },
  {
    text: 'Não são as coisas que perturbam os homens, mas as opiniões que eles têm delas.',
    author: 'Epicteto',
  },
  {
    text: 'A gratidão não é somente a maior das virtudes, mas a mãe de todas as demais.',
    author: 'Marco Túlio Cícero',
  },
  {
    text: 'Sapere aude — tem a coragem de fazer uso da tua própria razão.',
    author: 'Immanuel Kant',
  },
  { text: 'Mais luz!', author: 'Johann Wolfgang von Goethe (últimas palavras, atribuída)' },
  { text: 'Ouse ser sábio; comece já.', author: 'Johann Wolfgang von Goethe' },
  { text: 'Cada um vê o que traz no coração.', author: 'Johann Wolfgang von Goethe' },
  {
    text: 'O trabalho afasta de nós três grandes males: o tédio, o vício e a necessidade.',
    author: 'Voltaire',
  },
  { text: 'O coração tem razões que a própria razão desconhece.', author: 'Blaise Pascal' },
  {
    text: 'Diga-me e eu esqueço; ensina-me e eu me lembro; envolve-me e eu aprendo.',
    author: 'Benjamin Franklin',
  },
  {
    text: 'Um investimento em conhecimento paga sempre o melhor juro.',
    author: 'Benjamin Franklin',
  },
  { text: 'A verdadeira amizade é uma planta de crescimento lento.', author: 'George Washington' },
  {
    text: 'Nós moldamos nossos edifícios, e depois eles nos moldam.',
    author: 'Winston Churchill',
  },
  {
    text: 'Se consegues manter a cabeça no lugar quando todos ao teu redor a perdem — o mundo e tudo o que nele existe será teu.',
    author: 'Rudyard Kipling, do poema "Se—"',
  },
  { text: 'Sê tu mesmo; os outros já existem.', author: 'Oscar Wilde' },
  {
    text: 'Nada é mais poderoso do que uma ideia cujo tempo chegou.',
    author: 'Victor Hugo',
  },
  { text: 'Ter um amigo é ter uma segunda alma.', author: 'Victor Hugo' },
  { text: 'Tudo parece impossível até que seja feito.', author: 'Nelson Mandela' },
  {
    text: 'A educação é a arma mais poderosa que podes usar para mudar o mundo.',
    author: 'Nelson Mandela',
  },
  {
    text: 'A escuridão não pode expulsar a escuridão; só a luz pode fazer isso.',
    author: 'Martin Luther King Jr.',
  },
  { text: 'Sê a mudança que desejas ver no mundo.', author: 'Mahatma Gandhi' },
  { text: 'O melhor jeito de prever o futuro é criá-lo.', author: 'Abraham Lincoln' },
  {
    text: 'Um povo ignorante é instrumento cego da sua própria destruição.',
    author: 'Simón Bolívar',
  },
  { text: 'Ser culto é o único modo de ser livre.', author: 'José Martí' },
  { text: 'A sabedoria é filha da experiência.', author: 'Leonardo da Vinci' },
  {
    text: 'A mente que se abre a uma nova ideia jamais volta ao seu tamanho original.',
    author: 'Albert Einstein',
  },
  {
    text: 'Somos aquilo que fazemos repetidamente. A excelência, portanto, não é um feito, mas um hábito.',
    author: 'Will Durant, parafraseando Aristóteles',
  },
  { text: 'Uma jornada de mil léguas começa com um único passo.', author: 'Lao-Tsé' },
  { text: 'Trabalhar é amor tornado visível.', author: 'Khalil Gibran' },
  { text: 'Tudo vale a pena se a alma não é pequena.', author: 'Fernando Pessoa' },
  { text: 'A gratidão é a memória do coração.', author: 'Miguel de Cervantes' },
  { text: 'Conhecer-se a si mesmo é o princípio de toda sabedoria.', author: 'Aristóteles' },
  {
    text: 'Empresta o teu ouvido a todos, mas a poucos a tua voz.',
    author: 'William Shakespeare',
  },
  {
    text: 'Nada é permanente neste mundo, nem mesmo os nossos problemas.',
    author: 'Charles Chaplin',
  },
  {
    text: 'A pedra bruta só se torna cúbica sob o golpe paciente do malho e do cinzel.',
    author: 'Provérbio maçônico',
  },
  {
    text: 'Poli a tua própria pedra antes de julgar a obra do teu Irmão.',
    author: 'Tradição maçônica',
  },
  {
    text: 'Da escuridão busca-se a luz; do erro, a verdade; da ignorância, o saber.',
    author: 'Antigo dito maçônico',
  },
  { text: 'O esquadro corrige a ação; o compasso limita a ambição.', author: 'Landmark maçônico' },
  {
    text: 'Trabalha em silêncio e deixa que a obra fale por ti.',
    author: 'Provérbio maçônico',
  },
  {
    text: 'O prumo ensina a retidão; o nível, a igualdade entre os Irmãos.',
    author: 'Tradição maçônica',
  },
  {
    text: 'Nenhum templo se ergue sem que cada pedra encontre o seu lugar.',
    author: 'Antigo dito maçônico',
  },
  {
    text: 'A verdadeira Luz não ofusca: ilumina o caminho de quem a busca com humildade.',
    author: 'Landmark maçônico',
  },
  { text: 'Entre as trevas e a Luz, o Aprendiz escolhe caminhar.', author: 'Provérbio maçônico' },
  {
    text: 'A corrente de união não tem elo mais forte do que o mais fraco dos Irmãos.',
    author: 'Tradição maçônica',
  },
  {
    text: 'O avental do obreiro vale mais do que qualquer condecoração, pois se conquista com o suor da própria obra.',
    author: 'Antigo dito maçônico',
  },
  {
    text: 'Quem não sabe calar não saberá falar; quem não sabe obedecer não saberá mandar.',
    author: 'Landmark maçônico',
  },
  {
    text: 'A régua de vinte e quatro polegadas lembra que o tempo mal empregado não retorna.',
    author: 'Provérbio maçônico',
  },
  {
    text: 'Circunspecção e tolerância sustentam a coluna da sabedoria.',
    author: 'Tradição maçônica',
  },
  {
    text: 'O Grande Arquiteto do Universo não exige perfeição — exige trabalho constante.',
    author: 'Antigo dito maçônico',
  },
  {
    text: 'A escada misteriosa não se sobe de um só passo, mas degrau após degrau.',
    author: 'Landmark maçônico',
  },
  {
    text: 'Onde há discórdia entre Irmãos, falta o cimento da fraternidade.',
    author: 'Provérbio maçônico',
  },
  {
    text: 'O verdadeiro tesouro do maçom não se guarda em cofre: distribui-se em boas obras.',
    author: 'Tradição maçônica',
  },
  {
    text: 'A pedra bruta representa o homem antes da educação; a pedra polida, o homem depois dela.',
    author: 'Antigo dito maçônico',
  },
  {
    text: 'O templo mais importante não é de pedra: constrói-se dentro do coração do obreiro.',
    author: 'Landmark maçônico',
  },
  { text: 'Quem teme o cinzel jamais deixará de ser pedra bruta.', author: 'Provérbio maçônico' },
  {
    text: 'A obra do maçom nunca está terminada — apenas avança um degrau por vez.',
    author: 'Tradição maçônica',
  },
  {
    text: 'O malhete governa a Loja como a razão deve governar o homem.',
    author: 'Antigo dito maçônico',
  },
  {
    text: 'Sob o teto estrelado, todos os Irmãos são iguais, ainda que distintos os seus graus.',
    author: 'Landmark maçônico',
  },
  {
    text: 'A luz do Oriente não se impõe: conquista-se com estudo e virtude.',
    author: 'Provérbio maçônico',
  },
  {
    text: 'O silêncio do Aprendiz é o primeiro degrau da sabedoria do Mestre.',
    author: 'Tradição maçônica',
  },
  {
    text: 'Tolerância é reconhecer no Irmão a pedra que ainda se lapida.',
    author: 'Antigo dito maçônico',
  },
  { text: 'A fraternidade não se declara: pratica-se.', author: 'Landmark maçônico' },
  {
    text: 'O compasso limita os excessos; o esquadro corrige os desvios.',
    author: 'Provérbio maçônico',
  },
  {
    text: 'Cada Irmão é, ao mesmo tempo, pedra da obra e obreiro que a constrói.',
    author: 'Tradição maçônica',
  },
  {
    text: 'Visita o interior da terra e, retificando, encontrarás a pedra oculta.',
    author: 'Antigo dito maçônico',
  },
  {
    text: 'A Loja não é feita de paredes, mas da união de corações que nela trabalham.',
    author: 'Landmark maçônico',
  },
  { text: 'Onde a Luz entra, recuam as trevas da ignorância.', author: 'Provérbio maçônico' },
  {
    text: 'O verdadeiro Mestre é aquele que nunca deixa de ser Aprendiz.',
    author: 'Tradição maçônica',
  },
  {
    text: 'Não há degrau alto demais para quem sobe com paciência e trabalho.',
    author: 'Antigo dito maçônico',
  },
  {
    text: 'A pedra angular sustenta o edifício; a virtude sustenta o homem.',
    author: 'Landmark maçônico',
  },
  {
    text: 'Aprender a calar é o primeiro trabalho do obreiro; aprender a agir, o segundo.',
    author: 'Provérbio maçônico',
  },
  {
    text: 'O nível não humilha o alto nem exalta o baixo: iguala o justo.',
    author: 'Tradição maçônica',
  },
  {
    text: 'A obra do Grande Arquiteto se revela em cada pedra bem lavrada.',
    author: 'Antigo dito maçônico',
  },
  {
    text: 'Quem busca a Luz sem esforço encontra apenas a sombra de si mesmo.',
    author: 'Landmark maçônico',
  },
  {
    text: 'O martelo do Venerável ordena; a consciência do Irmão obedece.',
    author: 'Provérbio maçônico',
  },
  {
    text: 'As colunas sustentam o templo como a virtude sustenta o caráter.',
    author: 'Tradição maçônica',
  },
  {
    text: 'Cada golpe de cinzel na pedra bruta é um passo rumo à perfeição possível.',
    author: 'Antigo dito maçônico',
  },
  {
    text: 'A fraternidade verdadeira não escolhe fronteiras nem credos.',
    author: 'Landmark maçônico',
  },
  { text: 'O Aprendiz observa, o Companheiro constrói, o Mestre ensina.', author: 'Provérbio maçônico' },
  {
    text: 'A humildade é o primeiro degrau da escada que leva à Luz.',
    author: 'Tradição maçônica',
  },
  {
    text: 'Onde não há trabalho, não há progresso; onde não há progresso, a pedra permanece bruta.',
    author: 'Antigo dito maçônico',
  },
  {
    text: 'O maçom mede o próprio valor pela obra que deixa, não pelas palavras que profere.',
    author: 'Landmark maçônico',
  },
  {
    text: 'A verdadeira riqueza do obreiro é o conhecimento que ele compartilha.',
    author: 'Provérbio maçônico',
  },
  {
    text: 'Guarda o teu templo interior como guardas os segredos da Ordem.',
    author: 'Tradição maçônica',
  },
  {
    text: 'A ordem da Loja começa pela ordem dentro do próprio coração.',
    author: 'Antigo dito maçônico',
  },
  { text: 'O malho golpeia a pedra, mas é a paciência que a transforma.', author: 'Landmark maçônico' },
  {
    text: 'Não há Luz que ilumine quem se recusa a abrir os olhos.',
    author: 'Provérbio maçônico',
  },
  { text: 'A caridade do maçom não pede recompensa nem aplauso.', author: 'Tradição maçônica' },
  {
    text: 'O Oriente aponta o caminho; ao obreiro cabe caminhar até ele.',
    author: 'Antigo dito maçônico',
  },
  { text: 'Cada Irmão carrega uma pedra; juntos, erguem uma catedral.', author: 'Landmark maçônico' },
  {
    text: 'A verdadeira força da Loja está na fraqueza que os Irmãos se dispõem a ajudar.',
    author: 'Provérbio maçônico',
  },
  {
    text: 'Onde o esquadro e o compasso se encontram, nasce o equilíbrio do homem justo.',
    author: 'Tradição maçônica',
  },
  {
    text: 'A obra maçônica nunca se conclui: transmite-se de geração em geração.',
    author: 'Antigo dito maçônico',
  },
  {
    text: 'Trabalhar, aprender e servir — eis os três pilares do obreiro fiel.',
    author: 'Landmark maçônico',
  },
];

const SAO_PAULO_TIME_ZONE = 'America/Sao_Paulo';

function saoPauloDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: SAO_PAULO_TIME_ZONE }).format(date);
}

export interface QuoteRotationSettings {
  modo: QuoteRotationMode;
  intervaloMinutos: number | null;
}

/**
 * Escolhe a "frase do dia" a partir do pool cadastrado pelo Admin em
 * Conteúdo → Frases (ou do banco embutido acima, quando o Admin ainda não
 * cadastrou nenhuma), conforme a cadência de rotação escolhida:
 * - `recarga`: sorteio novo a cada carregamento da página;
 * - `diaria`: escolha determinística por dia (fuso da Loja) — todo mundo vê
 *   a mesma frase no mesmo dia;
 * - `intervalo`: troca a cada `intervaloMinutos`, igual para todo mundo
 *   dentro da mesma janela de tempo.
 */
export function pickQuote(
  quotes: MasonicQuote[],
  settings: QuoteRotationSettings,
  now: Date,
): MasonicQuote {
  const pool = quotes.length > 0 ? quotes : MASONIC_QUOTES;

  if (settings.modo === 'recarga') {
    const index = Math.floor(Math.random() * pool.length);
    return pool[index]!;
  }

  if (settings.modo === 'intervalo' && settings.intervaloMinutos) {
    const bucket = Math.floor(now.getTime() / (settings.intervaloMinutos * 60_000));
    return pool[bucket % pool.length]!;
  }

  const key = saoPauloDateKey(now).replace(/-/g, '');
  return pool[Number(key) % pool.length]!;
}
