import { Router, type IRouter } from "express";
import healthRouter from "./health";
import collegesRouter from "./colleges";
import subjectsRouter from "./subjects";
import proposalsRouter from "./proposals";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(collegesRouter);
router.use(subjectsRouter);
router.use(proposalsRouter);
router.use(dashboardRouter);

export default router;
