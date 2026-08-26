import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '../../../../components/ui/Badge';
import type { MaterialStockStatus } from '../../../../types/craft-materials';

export function MaterialStatusBadge({ status }: { status: MaterialStockStatus | string }) {
  if (status === 'out_of_stock') return <Badge variant="error"><AlertTriangle className="h-3 w-3" />Habis</Badge>;
  if (status === 'low_stock') return <Badge variant="warning"><AlertTriangle className="h-3 w-3" />Stok Menipis</Badge>;
  return <Badge variant="success">Normal</Badge>;
}
