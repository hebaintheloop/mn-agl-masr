"use client";
import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
export function PasswordField({ mode }: { mode: string }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-field">
      <label htmlFor={id}>
        {mode === "recover" ? "كلمة المرور الجديدة" : "كلمة المرور"}
      </label>
      <div className="password-input">
        <input
          id={id}
          name="password"
          type={visible ? "text" : "password"}
          minLength={12}
          maxLength={128}
          required
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          aria-describedby={id + "-hint"}
        />
        <button
          type="button"
          className="password-toggle"
          aria-controls={id}
          aria-label={visible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          aria-pressed={visible}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? (
            <EyeOff size={20} aria-hidden="true" />
          ) : (
            <Eye size={20} aria-hidden="true" />
          )}
        </button>
      </div>
      <small id={id + "-hint"}>12 حرفًا على الأقل</small>
    </div>
  );
}
