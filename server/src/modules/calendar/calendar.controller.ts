import type { NextFunction, Response } from 'express';
import type { AuthRequest } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../shared/utils/response';
import { calendarService } from './calendar.service';
const principal = (req: AuthRequest) => ({ id: Number(req.user!.id), organization_id: Number(req.user!.organization_id), permissions: req.user!.permissions || [] });
export class CalendarController {
  feed = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await calendarService.feed(principal(req), req.query)); } catch (error) { next(error); } };
  summary = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await calendarService.summary(principal(req))); } catch (error) { next(error); } };
  meta = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await calendarService.meta(principal(req))); } catch (error) { next(error); } };
  get = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await calendarService.get(Number(req.params.id), principal(req))); } catch (error) { next(error); } };
  create = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await calendarService.create(principal(req), req.body), undefined, 201); } catch (error) { next(error); } };
  update = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await calendarService.update(Number(req.params.id), principal(req), req.body)); } catch (error) { next(error); } };
  remove = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await calendarService.remove(Number(req.params.id), principal(req))); } catch (error) { next(error); } };
  attendees = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await calendarService.setAttendees(Number(req.params.id), principal(req), req.body.attendee_ids)); } catch (error) { next(error); } };
  response = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await calendarService.respond(Number(req.params.id), principal(req), req.body.response_status_code)); } catch (error) { next(error); } };
}
