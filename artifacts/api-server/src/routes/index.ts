import { Router, type IRouter } from "express";
import healthRouter from "./health";
import marketplaceRouter from "./marketplace";
import menuRouter from "./menu";
import vendorsRouter from "./vendors";
import ordersRouter from "./orders";
import usersRouter from "./users";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(marketplaceRouter);
router.use(menuRouter);
router.use(vendorsRouter);
router.use(ordersRouter);
router.use(usersRouter);
router.use(adminRouter);

export default router;
