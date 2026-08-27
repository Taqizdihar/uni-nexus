import { getBusinessUnitByCode } from '../../shared/utils/business-unit';

export type { BusinessUnitContext } from '../../shared/utils/business-unit';
export { getBusinessUnitByCode } from '../../shared/utils/business-unit';

export const getCraftBusinessUnit = () => getBusinessUnitByCode('CRAFT');
export const getCraftBusinessUnitId = async () => (await getCraftBusinessUnit()).id;
