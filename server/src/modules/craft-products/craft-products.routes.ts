import { mkdirSync } from 'fs';
import path from 'path';
import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requirePermission } from '../../middleware/auth.middleware';
import { AppError } from '../../shared/errors/AppError';
import { CraftProductsController } from './craft-products.controller';
import { DESIGN_UPLOAD_ROOT, PRODUCT_UPLOAD_ROOT } from './craft-products.service';

const controller = new CraftProductsController();
export const craftProductsRoutes = Router();

const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const designExtensions = new Set(['.stl', '.3mf', '.step', '.stp', '.scad', '.obj', '.blend']);

const productImageUpload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, callback) => {
      const productId = String(req.params.id || 'invalid').replace(/[^0-9]/g, '') || 'invalid';
      const target = path.join(PRODUCT_UPLOAD_ROOT, productId);
      mkdirSync(target, { recursive: true });
      callback(null, target);
    },
    filename: (_req, file, callback) => callback(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!imageExtensions.has(path.extname(file.originalname).toLowerCase())) return callback(new AppError(400, 'UNSUPPORTED_IMAGE', 'Gunakan file JPG, JPEG, PNG, atau WEBP.'));
    callback(null, true);
  },
});

const designUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => { const target = path.join(DESIGN_UPLOAD_ROOT, '.tmp'); mkdirSync(target, { recursive: true }); callback(null, target); },
    filename: (_req, file, callback) => callback(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!designExtensions.has(path.extname(file.originalname).toLowerCase())) return callback(new AppError(400, 'UNSUPPORTED_DESIGN_FILE', 'Gunakan file STL, 3MF, STEP, SCAD, OBJ, atau BLEND.'));
    callback(null, true);
  },
});

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
