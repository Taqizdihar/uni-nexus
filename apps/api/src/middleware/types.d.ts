declare global {
  namespace Express {
    interface Request {
      auth?: { userId: bigint; sessionId: string };
      workspace?: { id: bigint; role: string };
    }
  }
}
export {};
