import { expect, test, type Page, type Route } from '@playwright/test';

/**
 * E2E chế độ cây chung (007) với Supabase giả lập bằng page.route (NFR-007-07).
 * Bản build cho project này có VITE_SUPABASE_URL=http://mock-supabase.test.
 */
const API = 'http://mock-supabase.test';

interface Row {
  id: string;
  content: string;
  author: string;
  category: string;
  paper_color: string;
  source: 'local' | 'shared';
  created_at: string;
  updated_at: string;
}

class MockSupabase {
  rows: Row[] = [];
  deleted = new Map<string, Row>();
  tokens = new Map<string, string>();
  used = 0;
  limit = 3;
  lastBody: Record<string, unknown> | null = null;
  failNextPost: 'network' | 'quota' | null = null;
  private seq = 0;

  seed(author: string, content: string) {
    const r = this.makeRow({ author, content });
    this.rows.push(r);
    return r;
  }

  private makeRow(o: Partial<Row>): Row {
    const ts = new Date(Date.UTC(2026, 11, 20, 0, 0, this.seq++)).toISOString();
    return {
      id: crypto.randomUUID(),
      content: 'x',
      author: 'Ẩn danh',
      category: 'other',
      paper_color: 'red',
      source: 'local',
      created_at: ts,
      updated_at: ts,
      ...o,
    };
  }

  quota() {
    return { used: this.used, limit: this.limit, remaining: Math.max(0, this.limit - this.used) };
  }

  async handle(route: Route) {
    const req = route.request();
    const url = new URL(req.url());
    const cors = {
      'Access-Control-Allow-Origin': req.headers()['origin'] ?? '*',
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    };
    const json = (status: number, body: unknown) =>
      route.fulfill({ status, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });

    if (url.pathname === '/rest/v1/public_wishes') {
      const limit = Number(url.searchParams.get('limit') ?? 100);
      const offset = Number(url.searchParams.get('offset') ?? 0);
      const sorted = [...this.rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
      return json(200, sorted.slice(offset, offset + limit));
    }

    const parts = url.pathname.replace('/functions/v1/wishes', '').split('/').filter(Boolean);
    const body = req.postData() ? (JSON.parse(req.postData()!) as Record<string, unknown>) : {};
    this.lastBody = body;

    if (req.method() === 'GET' && parts[0] === 'quota') return json(200, this.quota());

    if (req.method() === 'POST' && parts.length === 0) {
      if (this.failNextPost === 'network') {
        this.failNextPost = null;
        return route.abort('failed');
      }
      if (this.failNextPost === 'quota' || this.used >= this.limit) {
        this.failNextPost = null;
        return json(429, { error: 'QUOTA_EXCEEDED', message: '...' });
      }
      const row = this.makeRow({
        content: String(body.content),
        author: String(body.author) || 'Ẩn danh',
        category: String(body.category),
        paper_color: String(body.paperColor),
        source: (body.source as Row['source']) ?? 'local',
      });
      this.rows.push(row);
      this.tokens.set(row.id, String(body.ownerToken));
      this.used++;
      return json(201, { wish: row, quota: this.quota() });
    }

    const id = parts[0]!;
    if (this.tokens.get(id) !== body.ownerToken) return json(403, { error: 'FORBIDDEN' });
    if (req.method() === 'DELETE') {
      const row = this.rows.find((r) => r.id === id)!;
      this.rows = this.rows.filter((r) => r.id !== id);
      this.deleted.set(id, row);
      return json(200, { id });
    }
    if (req.method() === 'POST' && parts[1] === 'restore') {
      const row = this.deleted.get(id)!;
      this.deleted.delete(id);
      this.rows.push(row);
      return json(200, { wish: row });
    }
    return json(405, { error: 'METHOD' });
  }
}

async function setup(page: Page, mock: MockSupabase) {
  await page.route(`${API}/**`, (route) => mock.handle(route));
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('canvas')).toBeVisible({ timeout: 30_000 });
}

async function write(page: Page, content: string) {
  await page.getByRole('button', { name: /Viết điều ước/ }).click();
  await page.getByLabel(/Điều ước/).fill(content);
  await page.getByRole('button', { name: /Treo lên cây/ }).click();
}

test('AC-007-02 + AC-007-12: thấy điều ước của người khác, không có nút Sửa/Gỡ', async ({ page }) => {
  const mock = new MockSupabase();
  mock.seed('Hằng', 'Giáng sinh an lành cho mọi người');
  mock.seed('Nam', 'Năm mới thật nhiều sức khoẻ');
  await setup(page, mock);

  await expect(page.getByText('2/100 điều ước')).toBeVisible();
  await page.getByRole('button', { name: /Danh sách ước nguyện/ }).click();
  await page.getByRole('button', { name: /Điều ước của Hằng/ }).click();
  const card = page.getByRole('dialog', { name: 'Hằng' });
  await expect(card).toContainText('Giáng sinh an lành cho mọi người');
  await expect(card.getByRole('button', { name: /Chia sẻ/ })).toBeVisible();
  await expect(card.getByRole('button', { name: /Sửa/ })).toHaveCount(0);
  await expect(card.getByRole('button', { name: /Gỡ/ })).toHaveCount(0);
});

test('AC-007-05/06/07: hiện lượt còn lại + thông báo công khai; hết 3 lượt thì bị khoá', async ({ page }) => {
  const mock = new MockSupabase();
  await setup(page, mock);

  await page.getByRole('button', { name: /Viết điều ước/ }).click();
  await expect(page.getByText('Bạn còn 3/3 lượt viết')).toBeVisible();
  await expect(page.getByText('Điều ước sẽ hiển thị công khai cho mọi người.')).toBeVisible();
  await page.getByRole('button', { name: 'Đóng', exact: true }).first().click();

  for (let i = 1; i <= 3; i++) {
    await write(page, `Điều ước số ${i}`);
    await expect(page.getByText(`${i}/100 điều ước`)).toBeVisible();
    expect(String(mock.lastBody?.ownerToken)).toMatch(/^[A-Za-z0-9_-]{43}$/);
  }
  const tokens = await page.evaluate(() => JSON.parse(localStorage.getItem('banyan:owners:v1') ?? '{}'));
  expect(Object.keys(tokens)).toHaveLength(3);

  await page.getByRole('button', { name: /Viết điều ước/ }).click();
  await expect(page.getByText('Mỗi địa chỉ IP chỉ được viết 3 điều ước. Bạn đã dùng hết lượt.')).toBeVisible();
  await page.getByLabel(/Điều ước/).fill('Điều ước thứ tư');
  await expect(page.getByRole('button', { name: /Treo lên cây/ })).toBeDisabled();
});

test('AC-007-07: server trả 429 → báo lỗi, giữ bản nháp', async ({ page }) => {
  const mock = new MockSupabase();
  await setup(page, mock);
  mock.failNextPost = 'quota';
  await write(page, 'Bị chặn ở server');
  await expect(page.getByText('Mỗi địa chỉ IP chỉ được viết 3 điều ước. Bạn đã dùng hết lượt.').first()).toBeVisible();
  await expect(page.getByLabel(/Điều ước/)).toHaveValue('Bị chặn ở server');
  expect(mock.rows).toHaveLength(0);
});

test('AC-007-13: gỡ điều ước của mình rồi hoàn tác (gửi owner token)', async ({ page }) => {
  const mock = new MockSupabase();
  await setup(page, mock);
  await write(page, 'Của tôi');
  await expect(page.getByText('1/100 điều ước')).toBeVisible();

  await page.getByRole('button', { name: /Danh sách ước nguyện/ }).click();
  await page.getByRole('button', { name: /Điều ước của Ẩn danh: Của tôi/ }).click();
  const card = page.getByRole('dialog', { name: 'Ẩn danh' });
  await card.getByRole('button', { name: /Gỡ/ }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Gỡ' }).click();
  await expect(page.getByText('0/100 điều ước')).toBeVisible();
  expect(mock.deleted.size).toBe(1);

  await page.getByRole('button', { name: 'Hoàn tác' }).click();
  await expect(page.getByText('1/100 điều ước')).toBeVisible();
  expect(mock.rows).toHaveLength(1);
});

test('AC-007-14: mất mạng khi gửi → báo lỗi, không lưu vào localStorage', async ({ page }) => {
  const mock = new MockSupabase();
  await setup(page, mock);
  mock.failNextPost = 'network';
  await write(page, 'Mạng lỗi');
  await expect(page.getByText('Không kết nối được máy chủ. Vui lòng thử lại.')).toBeVisible();
  await expect(page.getByLabel(/Điều ước/)).toHaveValue('Mạng lỗi');
  expect(await page.evaluate(() => localStorage.getItem('banyan:wishes:v1'))).toBeNull();
});

test('AC-007-18: chế độ cây chung ẩn Nhập sao lưu và Xoá toàn bộ', async ({ page }) => {
  const mock = new MockSupabase();
  mock.seed('An', 'Học giỏi');
  await setup(page, mock);
  await page.getByRole('button', { name: /Sao lưu/ }).click();
  await expect(page.getByRole('button', { name: /Xuất sao lưu/ })).toBeVisible();
  await expect(page.getByText('Nhập sao lưu')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Xoá toàn bộ/ })).toHaveCount(0);
});

test('AC-007-19: điều ước người khác vừa viết xuất hiện khi làm mới (không tải lại trang)', async ({ page }) => {
  const mock = new MockSupabase();
  mock.seed('An', 'Điều ước đầu tiên');
  await setup(page, mock);
  await expect(page.getByText('1/100 điều ước')).toBeVisible();
  mock.seed('Bình', 'Người khác vừa viết');
  // Mô phỏng một chu kỳ làm mới (FR-007-04: định kỳ 30 s hoặc khi tab hiển thị lại)
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.getByText('2/100 điều ước')).toBeVisible();
});
