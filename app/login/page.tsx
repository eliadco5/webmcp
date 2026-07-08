import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#f9fafb",
    }}>
      <LoginForm />
    </div>
  );
}
