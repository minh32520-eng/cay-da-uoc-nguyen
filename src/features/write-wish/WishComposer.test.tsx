import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSuggestionsFor, STORAGE_KEYS } from '@/entities/wish';
import { WishComposer } from './WishComposer';

function setup(props: Partial<React.ComponentProps<typeof WishComposer>> = {}) {
  const onSubmit = vi.fn(() => true);
  const onClose = vi.fn();
  const utils = render(<WishComposer open onClose={onClose} onSubmit={onSubmit} {...props} />);
  const content = screen.getByLabelText(/Điều ước/) as HTMLTextAreaElement;
  const submit = screen.getByRole('button', { name: /Treo lên cây/ });
  return { ...utils, onSubmit, onClose, content, submit };
}

beforeEach(() => {
  vi.useRealTimers();
});

describe('WishComposer (002)', () => {
  it('AC-002-01: mở modal, focus vào ô nội dung', () => {
    const { content } = setup();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    expect(content).toHaveFocus();
  });

  it('AC-002-02: mặc định chủ đề "Khác", màu "Đỏ"', () => {
    setup();
    expect(screen.getByRole('radio', { name: /Khác/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Đỏ' })).toBeChecked();
  });

  it('AC-002-03: bộ đếm 200/200 và không nhận ký tự thứ 201', () => {
    const { content } = setup();
    fireEvent.change(content, { target: { value: 'a'.repeat(205) } });
    expect(content.value).toHaveLength(200);
    expect(screen.getByText('200/200')).toBeInTheDocument();
  });

  it('AC-002-04: xem trước theo màu và nội dung', async () => {
    const user = userEvent.setup();
    const { content } = setup();
    await user.click(screen.getByRole('radio', { name: 'Vàng' }));
    await user.type(content, 'Mẹ khoẻ');
    const preview = screen.getByRole('figure', { name: /Xem trước/ });
    expect(preview).toHaveTextContent('Mẹ khoẻ');
    expect(preview).toHaveStyle({ backgroundColor: '#f5c542' });
  });

  it('AC-002-06: nội dung trống → khoá nút gửi, báo lỗi khi rời ô', async () => {
    const user = userEvent.setup();
    const { content, submit } = setup();
    await user.type(content, '   ');
    await user.tab();
    expect(submit).toBeDisabled();
    expect(screen.getByText('Hãy viết điều ước của bạn.')).toBeInTheDocument();
    expect(content).toHaveAttribute('aria-invalid', 'true');
  });

  it('AC-002-07: từ cấm → không gửi, hiện lỗi', async () => {
    const user = userEvent.setup();
    const { content, submit, onSubmit } = setup();
    await user.type(content, 'đồ óc chó');
    await user.click(submit);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/từ ngữ không phù hợp/)).toBeInTheDocument();
  });

  it('AC-002-08: nội dung HTML hiển thị nguyên văn', async () => {
    const { content } = setup();
    fireEvent.change(content, { target: { value: '<img src=x onerror=alert(1)>' } });
    expect(screen.getByRole('figure')).toHaveTextContent('<img src=x onerror=alert(1)>');
    expect(document.querySelector('figure img')).toBeNull();
  });

  it('AC-002-09: gửi hợp lệ → draft đã trim, xoá bản nháp', async () => {
    const user = userEvent.setup();
    localStorage.setItem(STORAGE_KEYS.draft, JSON.stringify({ content: '  Đỗ đại học  ' }));
    const { submit, onSubmit } = setup();
    await user.click(submit);
    expect(onSubmit).toHaveBeenCalledWith(
      { content: 'Đỗ đại học', author: 'Ẩn danh', category: 'other', paperColor: 'red' },
      { pickSlot: false },
    );
    expect(localStorage.getItem(STORAGE_KEYS.draft)).toBeNull();
  });

  it('AC-002-10: tự lưu nháp sau 500 ms và khôi phục khi mở lại', () => {
    vi.useFakeTimers();
    const { content, unmount } = setup();
    fireEvent.change(content, { target: { value: 'Đỗ đại học' } });
    act(() => vi.advanceTimersByTime(600));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.draft)!).content).toBe('Đỗ đại học');
    unmount();
    vi.useRealTimers();
    const again = setup();
    expect(again.content.value).toBe('Đỗ đại học');
  });

  it('AC-002-11: Esc khi có dữ liệu → hỏi Giữ / Bỏ bản nháp', async () => {
    const user = userEvent.setup();
    const { content, onClose } = setup();
    await user.type(content, 'abc');
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Giữ bản nháp' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Bỏ bản nháp' }));
    expect(onClose).toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEYS.draft)).toBeNull();
  });

  it('AC-002-13: gợi ý lời ước theo chủ đề', async () => {
    const user = userEvent.setup();
    const { content } = setup();
    await user.click(screen.getByRole('radio', { name: /Học tập/ }));
    await user.click(screen.getByRole('button', { name: /Gợi ý lời ước/ }));
    expect(getSuggestionsFor('study')).toContain(content.value);
  });
});
