import React from 'react';
import { Badge } from '../../../../components/ui/Badge';

export function ProductStatusBadge({ active }: { active: boolean }) {
  return <Badge variant={active ? 'success' : 'default'}>{active ? 'Aktif' : 'Nonaktif'}</Badge>;
}

export const productTypeLabels = { premade: 'Produk Jadi', customizable: 'Dapat Dikustomisasi', custom_service: 'Layanan Custom' } as const;
