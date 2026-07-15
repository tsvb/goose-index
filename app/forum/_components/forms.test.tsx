import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { JoinForm, LoginForm, VerifyForm, SettingsForm, EmailChangeForm, type AuthAction } from "./forms";

const stub: AuthAction = async () => ({});

describe("auth forms", () => {
  it("JoinForm renders username + email inputs with old-school constraints", () => {
    const html = renderToStaticMarkup(<JoinForm action={stub} />);
    expect(html).toContain('name="username"');
    expect(html).toContain('name="email"');
    expect(html).toContain('pattern="[A-Za-z0-9_-]+"');
  });
  it("LoginForm renders only an email input", () => {
    const html = renderToStaticMarkup(<LoginForm action={stub} />);
    expect(html).toContain('name="email"');
    expect(html).not.toContain('name="username"');
  });
  it("VerifyForm carries the token in a hidden input", () => {
    const html = renderToStaticMarkup(<VerifyForm action={stub} token="T123" />);
    expect(html).toContain('type="hidden"');
    expect(html).toContain('value="T123"');
    expect(html).toContain("Complete sign-in");
  });
});

it("SettingsForm shows the current signature and its limit", () => {
  const html = renderToStaticMarkup(<SettingsForm action={stub} initialSignature="honk" />);
  expect(html).toContain("honk");
  expect(html).toContain('maxLength="200"'); // React static markup lowercases attributes
});
it("EmailChangeForm never displays an email address", () => {
  const html = renderToStaticMarkup(<EmailChangeForm action={stub} />);
  expect(html).not.toContain("@"); // page copy avoids emails entirely
});
