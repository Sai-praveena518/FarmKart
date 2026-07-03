import { AppStage, PhoneFrame, ScreenHeader } from "../components/MobileShell";

export default function Forbidden() {
  return (
    <AppStage>
      <PhoneFrame>
        <ScreenHeader title="403 Forbidden" tone="purple" back notification={false} />
        <div className="screen-body text-center">
          <div className="card p-5">
            <p className="text-4xl font-extrabold text-red-600">403</p>
            <p className="mt-2 text-lg font-extrabold text-gray-900">Forbidden</p>
            <p className="mt-2 text-sm font-bold text-gray-600">You do not have permission to access this admin area.</p>
          </div>
        </div>
      </PhoneFrame>
    </AppStage>
  );
}
