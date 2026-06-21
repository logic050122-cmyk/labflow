// T 是接口 data 字段的具体类型，使用泛型后不需要把 data 写成 any。
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

// 所有分页接口共用这一结构，与 docs/API.md 的约定保持一致。
export interface PageData<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}
