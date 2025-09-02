import { request } from 'umi';
export async function register(data) {
  return request('/wegismarkapi/user/register', {
    method: 'POST',
    data,
  });
}
