// Lets the node test scripts import app modules that use extensionless imports (as Vite allows).
import { registerHooks } from 'node:module';
registerHooks({
  resolve(spec, ctx, next) {
    try { return next(spec, ctx); } catch (e) {
      if ((spec.startsWith('.') || spec.startsWith('/')) && !/\.\w+$/.test(spec)) return next(spec + '.ts', ctx);
      throw e;
    }
  },
});
