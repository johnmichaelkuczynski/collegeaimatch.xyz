import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import collegesRouter from "./colleges";
import subjectsRouter from "./subjects";
import proposalsRouter from "./proposals";
import dashboardRouter from "./dashboard";
import webhooksRouter from "./webhooks";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(collegesRouter);
router.use(subjectsRouter);
router.use(proposalsRouter);
router.use(dashboardRouter);
router.use(webhooksRouter);

export default router;
