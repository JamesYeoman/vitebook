import { createFilter, FilterPattern } from '@rollup/pluginutils';
import {
  App,
  ensureLeadingSlash,
  Plugin,
  VM_PREFIX,
} from '@vitebook/core/node';
import { fs, logger, path } from '@vitebook/core/node/utils';
import kleur from 'kleur';

import type { ResolvedPreactServerPage } from '../shared';

export const PLUGIN_NAME = '@vitebook/preact' as const;

export type PreactPluginOptions = {
  /**
   * Path to Preact app file. The path can be absolute or relative to `<configDir>`.
   *
   * @default undefined
   */
  appFile?: string;

  /**
   * Filter out which files to be included as preact/react pages.
   *
   * @default /\.(jsx|tsx)($|\?)/
   */
  include?: FilterPattern;

  /**
   * Filter out which files to _not_ be included as preact/react pages.
   *
   * @default undefined
   */
  exclude?: FilterPattern;
};

const DEFAULT_INCLUDE_RE = /\.(jsx|tsx)($|\?)/;

const VIRTUAL_APP_ID = `${VM_PREFIX}/preact/app`;
const VIRTUAL_APP_REQUEST_PATH = '/' + VIRTUAL_APP_ID;

export function preactPlugin(options: PreactPluginOptions = {}): Plugin[] {
  let app: App;

  const filter = createFilter(
    options.include ?? DEFAULT_INCLUDE_RE,
    options.exclude,
  );

  return [
    {
      name: PLUGIN_NAME,
      enforce: 'pre',
      config() {
        return {
          resolve: {
            alias: {
              [VIRTUAL_APP_ID]: VIRTUAL_APP_REQUEST_PATH,
            },
          },
          optimizeDeps: {
            include: ['preact/debug', 'preact/devtools', '@prefresh/vite'],
            exclude: ['preact', 'preact/compat', 'preact/hooks'],
          },
        };
      },
      async configureApp(_app) {
        app = _app;

        try {
          const hasPreactPlugin = app.hasPlugin('preact:config');
          const hasMarkdownPreactPlugin = app.hasPlugin(
            '@vitebook/markdown-preact',
          );

          if (!hasPreactPlugin) {
            // We can't simply `import(...)` as it will fail in a monorepo (linked packages).
            const rootPath = app.dirs.root.resolve(
              'node_modules/@preact/preset-vite',
            );

            const modulePath = JSON.parse(
              (await fs.readFile(`${rootPath}/package.json`)).toString(),
            ).module;

            const preact = (await import(path.resolve(rootPath, modulePath)))
              .default;

            _app.plugins.push(
              preact({
                include: hasMarkdownPreactPlugin
                  ? /\.([j|t]sx?|md)$/
                  : undefined,
              }),
            );
          }
        } catch (e) {
          throw logger.createError(
            `${kleur.bold('@vitebook/preact')} requires ${kleur.bold(
              '@preact/preset-vite',
            )}\n\n${kleur.white(
              `See ${kleur.bold(
                'https://github.com/preactjs/preset-vite',
              )} for more information`,
            )}\n`,
          );
        }
      },
      resolvePage({
        filePath,
        relativeFilePath,
      }): ResolvedPreactServerPage | null {
        if (filter(filePath)) {
          return {
            id: '@vitebook/preact/PreactPageView.svelte',
            type: `preact:${path.extname(filePath).slice(1) as 'jsx' | 'tsx'}`,
            context: {
              loader: `() => import('${ensureLeadingSlash(relativeFilePath)}')`,
            },
          };
        }

        return null;
      },
      resolveId(id) {
        if (id === VIRTUAL_APP_REQUEST_PATH) {
          const appFile = options.appFile;
          const path = appFile && app.dirs.config.resolve(appFile);
          return path && fs.existsSync(path) ? { id: path } : id;
        }

        return null;
      },
      load(id) {
        if (id === VIRTUAL_APP_REQUEST_PATH) {
          return `
function App({ component }) {
  return component;
}

App.displayName = 'VitebookApp';

export default App;
          `;
        }

        return null;
      },
    },
  ];
}
