// Bootstrap — inicializa o CORE Enterprise: ComponentRegistry, células e contratos
import { registerCoreComponents } from './ui/ComponentRegistry';
import { registerCmsCell } from './cms/CmsCell';
import { registerCheckBoulerCell } from './checkbouler/CheckBoulerCell';

export function bootstrapCore(): void {
  registerCoreComponents();
  registerCmsCell();
  registerCheckBoulerCell();
}
