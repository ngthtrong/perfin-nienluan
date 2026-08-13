// Vai trò: Chuẩn hóa dialog thông báo giữa native Alert và fallback trên web.
// Luồng chính: ghép nội dung/nút, chọn hành động mặc định và giữ cùng interface đa nền tảng.

import { Alert, Platform } from 'react-native';

function messageText(title, message) {
  return [title, message].filter(Boolean).join('\n\n');
}

function firstActionButton(buttons, cancelButton) {
  return buttons.find((button) => button !== cancelButton && button.style === 'destructive')
    || buttons.find((button) => button !== cancelButton && typeof button.onPress === 'function')
    || buttons.find((button) => button !== cancelButton);
}

/**
 * React Native Web intentionally implements Alert.alert as a no-op. Keep the
 * native API shape, but use the browser's blocking dialogs on web so validation
 * messages and destructive confirmations cannot silently disappear.
 */
export function showAlert(title, message, buttons, options) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return Alert.alert(title, message, buttons, options);
  }

  const normalizedButtons = Array.isArray(buttons) && buttons.length
    ? buttons
    : [{ text: 'OK' }];

  if (normalizedButtons.length === 1) {
    window.alert(messageText(title, message));
    return normalizedButtons[0].onPress?.();
  }

  const cancelButton = normalizedButtons.find((button) => button.style === 'cancel');
  const actionButton = firstActionButton(normalizedButtons, cancelButton);
  const actionHint = actionButton?.text ? `\n\nChọn OK để “${actionButton.text}”.` : '';
  const confirmed = window.confirm(`${messageText(title, message)}${actionHint}`);
  const selectedButton = confirmed ? actionButton : cancelButton;
  return selectedButton?.onPress?.();
}
