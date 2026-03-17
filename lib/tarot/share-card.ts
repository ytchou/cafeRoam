import html2canvas from 'html2canvas';
import type { TarotCardData } from '@/types/tarot';

function setText(el: HTMLElement, text: string): void {
  el.textContent = text;
}

function makeEl(
  tag: string,
  styles: Partial<CSSStyleDeclaration>,
  content?: string
): HTMLElement {
  const el = document.createElement(tag);
  Object.assign(el.style, styles);
  if (content !== undefined) setText(el, content);
  return el;
}

export async function generateShareCard(card: TarotCardData): Promise<Blob> {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '.');

  const container = document.createElement('div');
  Object.assign(container.style, {
    position: 'fixed',
    left: '-9999px',
    top: '0',
    width: '1080px',
    height: '1920px',
    background: '#2C1810',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px',
    boxSizing: 'border-box',
    fontFamily: 'sans-serif',
  });

  const header = makeEl(
    'div',
    {
      color: '#C4922A',
      fontSize: '36px',
      marginBottom: '40px',
      letterSpacing: '4px',
    },
    'CafeRoam \u554A\u904A \u2726'
  );
  container.appendChild(header);

  if (card.coverPhotoUrl) {
    const img = document.createElement('img');
    img.src = card.coverPhotoUrl;
    img.crossOrigin = 'anonymous';
    Object.assign(img.style, {
      width: '920px',
      height: '700px',
      objectFit: 'cover',
      borderRadius: '16px',
      marginBottom: '60px',
    });
    container.appendChild(img);
  } else {
    const placeholder = makeEl(
      'div',
      {
        width: '920px',
        height: '700px',
        background: '#3D2920',
        borderRadius: '16px',
        marginBottom: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '120px',
        color: '#C4922A',
      },
      card.name.charAt(0) || ''
    );
    container.appendChild(placeholder);
  }

  const title = makeEl(
    'div',
    {
      color: '#F5EDE4',
      fontSize: '56px',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: '6px',
      textAlign: 'center',
      marginBottom: '30px',
    },
    card.tarotTitle
  );
  const name = makeEl(
    'div',
    { color: '#F5EDE4', fontSize: '40px', marginBottom: '12px' },
    card.name
  );
  const neighborhood = makeEl(
    'div',
    { color: '#C4922A', fontSize: '32px', marginBottom: '60px' },
    card.neighborhood
  );
  const date = makeEl(
    'div',
    { color: '#C4922A', fontSize: '28px', letterSpacing: '2px' },
    `Drawn ${today}`
  );

  container.appendChild(title);
  container.appendChild(name);
  container.appendChild(neighborhood);
  container.appendChild(date);

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      width: 1080,
      height: 1920,
      scale: 1,
      useCORS: true,
      backgroundColor: '#2C1810',
    });

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to generate share card'));
        },
        'image/png',
        1.0
      );
    });
  } finally {
    document.body.removeChild(container);
  }
}

export async function shareCard(
  card: TarotCardData
): Promise<'native' | 'download'> {
  const blob = await generateShareCard(card);
  const file = new File([blob], `caferoam-tarot-${card.shopId}.png`, {
    type: 'image/png',
  });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: `${card.tarotTitle} \u2014 CafeRoam \u554A\u904A`,
    });
    return 'native';
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return 'download';
}
