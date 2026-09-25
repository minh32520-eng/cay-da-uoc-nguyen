import { expect, test, type Page } from '@playwright/test';
import LZString from 'lz-string';

const { compressToEncodedURIComponent } = LZString;

async function hangWish(page: Page, content: string, author = '') {
  await page.getByRole('button', { name: /Viết điều ước/ }).click();
  await page.getByLabel(/Điều ước/).fill(content);
  if (author) await page.getByLabel('Tên của bạn').fill(author);
  await page.getByRole('button', { name: /Treo lên cây/ }).click();
  await expect(page.getByText('Điều ước của bạn đã được treo lên cây đa')).toBeVisible({ timeout: 5000 });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('canvas')).toBeVisible({ timeout: 30_000 });
});

test('AC-001-01: hiển thị cảnh 3D cây đa', async ({ page }) => {
  await expect(page.getByRole('img', { name: /Cảnh 3D cây đa/ })).toBeVisible();
  await expect(page.getByText('0/100 điều ước')).toBeVisible();
});

test('AC-003-05/06: treo ước nguyện, reload vẫn còn', async ({ page }) => {
  await hangWish(page, 'Cả nhà mạnh khoẻ', 'Lan');
  await expect(page.getByText('1/100 điều ước')).toBeVisible();
  await page.reload();
  await expect(page.getByText('1/100 điều ước')).toBeVisible();
});

test('AC-004-05/09 + AC-005-03/04: tìm, mở chi tiết, gỡ rồi hoàn tác', async ({ page }) => {
  await hangWish(page, 'Thi đỗ đại học', 'Minh');
  await hangWish(page, 'Mẹ khoẻ', 'Lan');

  await page.getByRole('button', { name: /Danh sách ước nguyện/ }).click();
  await page.getByRole('searchbox').fill('dai hoc');
  await expect(page.getByText('1 điều ước', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Điều ước của Minh/ }).click();

  const card = page.getByRole('dialog', { name: 'Minh' });
  await expect(card).toContainText('Thi đỗ đại học');

  await card.getByRole('button', { name: /Gỡ/ }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Gỡ' }).click();
  await expect(page.getByText('1/100 điều ước')).toBeVisible();
  await page.getByRole('button', { name: 'Hoàn tác' }).click();
  await expect(page.getByText('2/100 điều ước')).toBeVisible();
});

test('AC-006-06/07/09: mở link chia sẻ và treo lên cây của mình', async ({ page }) => {
  const payload = compressToEncodedURIComponent(
    JSON.stringify({ v: 1, c: 'Trăng rằm thật tròn 🌕', a: 'Hằng', k: 'love', p: 'pink', t: '2026-09-25T12:00:00.000Z' }),
  );
  await page.goto(`/#/w/${payload}`);
  const overlay = page.getByRole('dialog', { name: 'Một điều ước được gửi tới bạn' });
  await expect(overlay).toContainText('Trăng rằm thật tròn 🌕');
  await overlay.getByRole('button', { name: /Treo lên cây của tôi/ }).click();
  await expect(page.getByText('1/100 điều ước')).toBeVisible();
  expect(new URL(page.url()).hash).toBe('#/');
});

test('AC-006-10: link hỏng → cây hiển thị bình thường + báo lỗi', async ({ page }) => {
  await page.goto('/#/w/khong-hop-le');
  await expect(page.getByText('Link chia sẻ không hợp lệ hoặc đã bị hỏng.')).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
});

test('AC-001-08: chế độ 2D có thể dùng bằng bàn phím', async ({ page }) => {
  await hangWish(page, 'Học giỏi', 'An');
  await page.getByRole('button', { name: 'Chế độ 2D' }).click();
  const paper = page.getByRole('button', { name: 'Điều ước của An: Học giỏi' });
  await paper.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'An' })).toBeVisible();
});
