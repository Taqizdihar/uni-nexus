import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.middleware';
import { createUpload } from '../../shared/storage';
import { CraftProductsController } from './craft-products.controller';

const controller = new CraftProductsController();
export const craftProductsRoutes = Router();

const productImageUpload = createUpload('product_image');
const designUpload = createUpload('product_design');

craftProductsRoutes.use(requireAuth);

craftProductsRoutes.get('/', requirePermission('craft.products.read'), controller.getProducts);
craftProductsRoutes.post('/', requirePermission('craft.products.write'), controller.createProduct);

// Static routes must stay above /:id routes.
craftProductsRoutes.get('/categories', requirePermission('craft.products.read'), controller.getCategories);
craftProductsRoutes.post('/categories', requirePermission('craft.products.write'), controller.createCategory);
craftProductsRoutes.patch('/categories/:categoryId', requirePermission('craft.products.write'), controller.updateCategory);
craftProductsRoutes.delete('/categories/:categoryId', requirePermission('craft.products.write'), controller.deactivateCategory);

craftProductsRoutes.get('/design-files', requirePermission('craft.products.read'), controller.getDesignFiles);
craftProductsRoutes.post('/design-files', requirePermission('craft.products.write'), designUpload.single('file'), controller.uploadDesignFile);
craftProductsRoutes.get('/design-files/:designId/download', requirePermission('craft.products.read'), controller.downloadDesignFile);
craftProductsRoutes.patch('/design-files/:designId', requirePermission('craft.products.write'), controller.updateDesignFile);
craftProductsRoutes.delete('/design-files/:designId', requirePermission('craft.products.write'), controller.deleteDesignFile);

craftProductsRoutes.get('/print-profiles', requirePermission('craft.products.read'), controller.getPrintProfiles);
craftProductsRoutes.post('/print-profiles', requirePermission('craft.products.write'), controller.createPrintProfile);
craftProductsRoutes.patch('/print-profiles/:profileId', requirePermission('craft.products.write'), controller.updatePrintProfile);
craftProductsRoutes.post('/print-profiles/:profileId/default', requirePermission('craft.products.write'), controller.setDefaultPrintProfile);
craftProductsRoutes.delete('/print-profiles/:profileId', requirePermission('craft.products.write'), controller.deletePrintProfile);

craftProductsRoutes.get('/:id', requirePermission('craft.products.read'), controller.getProduct);
craftProductsRoutes.patch('/:id', requirePermission('craft.products.write'), controller.updateProduct);
craftProductsRoutes.delete('/:id', requirePermission('craft.products.write'), controller.archiveProduct);
craftProductsRoutes.post('/:id/reactivate', requirePermission('craft.products.write'), controller.reactivateProduct);

craftProductsRoutes.post('/:id/image', requirePermission('craft.products.write'), productImageUpload.single('image'), controller.uploadImage);
craftProductsRoutes.get('/:id/image', requirePermission('craft.products.read'), controller.getImage);
craftProductsRoutes.delete('/:id/image', requirePermission('craft.products.write'), controller.removeImage);

craftProductsRoutes.get('/:id/variants', requirePermission('craft.products.read'), controller.getVariants);
craftProductsRoutes.post('/:id/variants', requirePermission('craft.products.write'), controller.createVariant);
craftProductsRoutes.patch('/:id/variants/:variantId', requirePermission('craft.products.write'), controller.updateVariant);

craftProductsRoutes.get('/:id/boms', requirePermission('craft.products.read'), controller.getBoms);
craftProductsRoutes.post('/:id/boms', requirePermission('craft.products.write'), controller.createBom);
craftProductsRoutes.patch('/:id/boms/:bomId', requirePermission('craft.products.write'), controller.updateBom);
craftProductsRoutes.post('/:id/boms/:bomId/activate', requirePermission('craft.products.write'), controller.activateBom);

craftProductsRoutes.get('/:id/costing', requirePermission('craft.products.read'), controller.getCosting);
