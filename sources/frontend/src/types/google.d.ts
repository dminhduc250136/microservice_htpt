/**
 * Khai báo tối thiểu cho Google Identity Services (GIS) client loaded qua https://accounts.google.com/gsi/client.
 * Chỉ khai báo những API ta dùng: initialize + renderButton.
 */
interface GoogleCredentialResponse {
  credential: string; // ID token (JWT)
  select_by?: string;
}

interface GoogleIdConfig {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  /** false → account chooser mở popup cửa sổ thật (căn giữa) thay vì khung FedCM góc phải. */
  use_fedcm_for_button?: boolean;
  ux_mode?: 'popup' | 'redirect';
}

interface GoogleButtonConfig {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number;
  locale?: string;
}

interface Window {
  google?: {
    accounts: {
      id: {
        initialize: (config: GoogleIdConfig) => void;
        renderButton: (parent: HTMLElement, options: GoogleButtonConfig) => void;
        prompt: () => void;
      };
    };
  };
}
