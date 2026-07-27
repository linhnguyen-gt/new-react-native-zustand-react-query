export * from './httpClient';
export { RootNavigator } from './navigation';

// `reactotron` is deliberately NOT re-exported here.
//
// This barrel also exports RootNavigator, which screens and navigators import, so
// re-exporting reactotron made the Reactotron module graph reachable from nearly
// every file. Importing that graph runs ReactotronCore's constructor, which calls
// .connect() and installs an XHR interceptor forwarding Authorization headers to a
// cleartext socket on port 9090.
//
// Import it directly, and only from inside an `if (__DEV__)` block, so the release
// minifier can drop it — Metro does no cross-module tree shaking.
