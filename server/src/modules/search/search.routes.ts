import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { SearchController } from './search.controller';

const router = Router();
const controller = new SearchController();

// No single route-level permission: each category inside SearchService checks its own
// read permission before it is allowed to contribute any result.
router.use(requireAuth);
router.get('/', controller.search);

export const searchRoutes = router;
