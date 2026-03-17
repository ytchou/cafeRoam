import html2canvas from 'html2canvas';
import type { TarotCardData } from '@/types/tarot';

export async function generateShareCard(card: TarotCardData): Promise<Blob> {
  const container = document.createElement('div');
  container.style.cssText =
    'position:fixed;left:-9999px;top:0;width:1080px;height:1920px;background:#2C1810;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px;box-sizing:border-box;font-family:sans-serif;';

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '.');

  container.innerHTML = `
    <div style="color:#C4922A;font-size:36px;margin-bottom:40px;letter-spacing:4px;">
      CafeRoam 啡遊 ✦
    </div>
    ${
      card.coverPhotoUrl
        ? `<img src="${card.coverPhotoUrl}" crossorigin="anonymous" style="width:920px;height:700px;object-fit:cover;border-radius:16px;margin-bottom:60px;" />`
        : `<div style="width:920px;height:700px;background:#3D2920;border-radius:16px;margin-bottom:60px;display:flex;align-items:center;justify-content:center;font-size:120px;color:#C4922A;">${card.name[0]}</div>`
    }
    <div style="color:#F5EDE4;font-size:56px;font-weight:700;text-transform:uppercase;letter-spacing:6px;text-align:center;margin-bottom:30px;">
      ${card.tarotTitle}
    </div>
    <div style="color:#F5EDE4;font-size:40px;margin-bottom:12px;">
      ${card.name}
    </div>
    <div style="color:#C4922A;font-size:32px;margin-bottom:60px;">
      ${card.neighborhood}
    </div>
    <div style="color:#C4922A;font-size:28px;letter-spacing:2px;">
      Drawn ${today}
    </div>
  `;

  document.body.appendChild(container);

  const canvas = await html2canvas(container, {
    width: 1080,
    height: 1920,
    scale: 1,
    useCORS: true,
    backgroundColor: '#2C1810',
  });

  document.body.removeChild(container);

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
}

export async function shareCard(card: TarotCardData): Promise<void> {
  const blob = await generateShareCard(card);
  const file = new File([blob], `caferoam-tarot-${card.shopId}.png`, {
    type: 'image/png',
  });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: `${card.tarotTitle} — CafeRoam 啡遊`,
    });
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  }
}
