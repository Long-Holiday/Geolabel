/**
 * @see https://umijs.org/zh-CN/plugins/plugin-access
 * */
export default function access(initialState) {
  const { currentState } = initialState || {};
  return {
    canAdmin: currentState && currentState.isAdmin === 1,
    canUser: currentState && currentState.isAdmin === 0,

  };
}
