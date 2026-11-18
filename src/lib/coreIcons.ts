import { Cloud, ScanLine, ShoppingCart, Store, Warehouse, type LucideIcon } from 'lucide-react';
import type { CoreFunctionType } from '@/types';

/** One recognisable icon per Core Function, used wherever a Core Function is shown. */
export const CORE_ICON: Record<CoreFunctionType, LucideIcon> = {
  'VTec POS': ShoppingCart,
  'VTec Store Backoffice': Store,
  'VTec HHT': ScanLine,
  'VTec Cloud Inventory': Warehouse,
  'VTec Cloud HQ': Cloud,
};
