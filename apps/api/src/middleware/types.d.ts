declare global {
  namespace Express {
    interface Request {
      auth?: { userId: bigint };
      workspace?: { id: bigint; role: string };
    }
  }
}
export {};
