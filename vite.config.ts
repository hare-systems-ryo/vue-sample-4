import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import checker from 'vite-plugin-checker';
import basicSsl from '@vitejs/plugin-basic-ssl';
declare const __dirname: any;

/** @type {import('vite').UserConfig} */
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const root = 'src';
  const outDir = '../dist';
  const envDir = '../env';
  const publicDir = '../public';
  const sourcemap = env.NODE_ENV === 'production' ? false : true;
  const reportCompressedSize = env.NODE_ENV === 'development' ? true : false;
  return {
    root: root,
    // root: process.cwd(),
    // ◆root
    // │ 型        : string
    // │ デフォルト: process.cwd()
    // ├─────────────────
    // │ プロジェクトのルートディレクトリ（index.html が置かれている場所）。
    // │ 絶対パス、または現在のワーキングディレクトリからの相対パスを指定できます。
    // │ 詳細は プロジェクトルート を参照してください。
    // └─────────────────
    base: '/vue-sample-4/',
    // ◆root
    // │ 型        : string
    // │ デフォルト: /
    // ├─────────────────
    // │ 開発環境または本番環境で配信される際のベースとなるパブリックパス。有効な値は次のとおりです:
    // │ 絶対 URL パス名。例 /foo/
    // │ 完全な URL。例 https://foo.com/
    // │ 空文字列または ./（埋め込みデプロイ用）
    // │ 詳細は Public Base Path を参照してください。
    // └─────────────────
    publicDir: publicDir,
    // ◆root
    // │ 型        : string
    // │ デフォルト: public
    // ├─────────────────
    // │ 加工せずに静的アセットとして配信するディレクトリ。このディレクトリのファイルは、開発時には / として配信され、ビルド時には outDir のルートにコピーされます。常に変換されることなくそのまま配信またはコピーされます。この値にはファイルシステムの絶対パスかプロジェクトルートからの相対パスを指定できます。
    // │ publicDir を false に設定すると、この機能は無効になります。
    // │ 詳細は public ディレクトリ を参照してください。
    // └─────────────────

    envDir: envDir,
    // envDir
    // │ 型        : string
    // │ デフォルト: root
    // ├─────────────────
    // │ .env ファイルを読み込むディレクトリ。
    // │ 絶対パス、もしくはプロジェクトルートからの相対パスを指定します。
    // │ 環境ファイルの詳細についてはこちらをご覧ください。
    // └─────────────────
    envPrefix: ['VITE_'],
    // envPrefix
    // │ 型        : string | string[]
    // │ デフォルト: VITE_
    // ├─────────────────
    // │ envPrefix で始まる環境変数は、import.meta.env でクライアントのソースコードに公開されます。
    // │
    // │ SECURITY NOTES
    // │ envPrefix に '' を設定してはいけません。
    // │ 全ての env 変数を公開してしまい、予期せぬ機密情報の漏洩を引き起こします。
    // │ Vite は '' を検出するとエラーをスローします。
    // └─────────────────
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    plugins: [
      vue(),
      checker({
        vueTsc: true,
        eslint: {
          lintCommand: 'eslint "./**/*.{ts,vue}"',
        },
      }),
      basicSsl(),
    ],

    build: {
      target: 'esnext',
      outDir: outDir,
      // ◆build.outDir
      // │ 型        : string
      // │ デフォルト: dist
      // ├─────────────────
      // │ 出力ディレクトリを指定します（プロジェクトルートからの相対パス）
      // └─────────────────
      assetsDir: 'assets',
      // ◆build.assetsDir
      // │ 型        : string
      // │ デフォルト: assets
      // ├─────────────────
      // │ 生成されたアセットをネストするディレクトリを指定します（build.outDir からの相対パス）。
      // └─────────────────
      assetsInlineLimit: 0,
      // ◆build.assetsInlineLimit
      // │ 型        : number
      // │ デフォルト: 4096 (4kb)
      // ├─────────────────
      // │ インポートもしくは参照されたアセットでこの閾値より小さいものは、
      // │ 余計な HTTP リクエストを避けるために base64 URL としてインライン化されます。
      // │ 0 に設定するとインライン化は完全に無効になります。
      // └─────────────────
      sourcemap: sourcemap,
      // ◆build.sourcemap
      // │ 型        : boolean | 'inline' | 'hidden'
      // │ デフォルト: false
      // ├─────────────────
      // │ 本番用のソースマップを作成します。true の場合、ソースマップファイルは別に作られます。
      // │ inline の場合、ソースマップは出力結果ファイルにデータ URI として追加されます。
      // │ hidden は true と同様に動作しますが、バンドルファイル内のソースマップを指し示すコメントは削除されます。
      // └─────────────────
      // cssCodeSplit: false,
      rollupOptions: {
        output: {
          entryFileNames: `assets/[name].[hash].js`,
          chunkFileNames: `assets/[name].[hash].js`,
          assetFileNames: `assets/[name].[hash].[ext]`,
        },
      },
      // ◆build.sourcemap
      // │ 型        : RollupOptions
      // │ デフォルト: false
      // ├─────────────────
      // │ 基礎となる Rollup バンドルを直接カスタマイズします。
      // │ これは、Rollup 設定ファイルからエクスポートされるオプションと同じで、
      // │ Vite 内部の Rollup オプションにマージされます。詳細は Rollup options docs を参照してください。
      // └─────────────────
      emptyOutDir: true,
      // ◆build.emptyOutDir
      // │ 型        : boolean
      // │ デフォルト: outDir が root 内にあると true
      // ├─────────────────
      // │ デフォルトでは、Vite はビルド時に outDir がプロジェクトルート内にある場合、それを空にします。
      // │ 重要なファイルを誤って削除してしまわないように、outDir がルートの外にある場合は警告を発します。
      // │ このオプションを明示的に設定することで、警告を出さないようにできます。
      // │ このオプションは、コマンドラインで --emptyOutDir としても利用できます。
      // └─────────────────
      reportCompressedSize: reportCompressedSize,
      // ◆build.reportCompressedSize
      // │ 型        : boolean
      // │ デフォルト: true
      // ├─────────────────
      // │ gzip 圧縮されたサイズレポートを有効/無効にします。
      // │ 大きな出力ファイルの圧縮には時間がかかるため、これを無効にすると、
      // │ 大規模なプロジェクトでのビルドのパフォーマンスが向上する可能性があります。
      // └─────────────────
      chunkSizeWarningLimit: 500,
      // ◆build.chunkSizeWarningLimit
      // │ 型        : number
      // │ デフォルト: 500
      // ├─────────────────
      // │ チャンクサイズ警告の制限値（kb 単位）。
      // └─────────────────
    },

    server: {
      host: '0.0.0.0',
      port: 8888,
      strictPort: false,
      https: true,
      open: true,
    },
  };
});
