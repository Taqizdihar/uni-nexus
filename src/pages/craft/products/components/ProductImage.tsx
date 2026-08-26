import React, { useEffect, useState } from 'react';
import { Box } from 'lucide-react';
import { craftProductsApi } from '../../../../services/api/craft-products.api';

export function ProductImage({ productId, hasImage, className = 'h-36' }: { productId: number; hasImage: boolean; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    if (!hasImage) { setUrl(null); return undefined; }
    void craftProductsApi.getImageBlob(productId).then(blob => {
      if (cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    }).catch(() => { if (!cancelled) setUrl(null); });
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [hasImage, productId]);

  return <div className={`${className} overflow-hidden bg-[linear-gradient(145deg,#f7f2e7,#ede6d8)]`}>
    {url ? <img src={url} alt="Gambar produk" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[var(--nexus-charcoal)]/25"><Box className="h-10 w-10" /></div>}
  </div>;
}
