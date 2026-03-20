export interface SweetAlertOptions {
  title?: string;
  text?: string;
  icon?: "success" | "error" | "warning" | "info" | "question";
  showCancelButton?: boolean;
  confirmButtonText?: string;
  cancelButtonText?: string;
  timer?: number;
  toast?: boolean;
  position?: "top" | "top-start" | "top-end" | "center" | "center-start" | "center-end" | "bottom" | "bottom-start" | "bottom-end";
  [key: string]: any;
}

let _swal: any | null = null;

async function getSwal() {
  if (_swal) return _swal;
  if (typeof window === "undefined") {
    // No-op on server
    return null;
  }

  const SwalModule = await import("sweetalert2");
  const withReactContent = (await import("sweetalert2-react-content")).default;
  const Swal = SwalModule.default ?? SwalModule;

  _swal = withReactContent(Swal);
  return _swal;
}

export async function sweetAlert(options: SweetAlertOptions) {
  const swal = await getSwal();
  if (!swal) return null;
  return swal.fire(options);
}

export async function sweetConfirm(options: SweetAlertOptions) {
  const result = await sweetAlert({
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: options.confirmButtonText ?? "Yes",
    cancelButtonText: options.cancelButtonText ?? "Cancel",
    ...options,
  });

  return result?.isConfirmed ?? false;
}

export async function sweetToast(options: SweetAlertOptions) {
  return sweetAlert({
    toast: true,
    position: options.position ?? "top-end",
    showConfirmButton: false,
    timer: options.timer ?? 1500,
    icon: options.icon ?? "success",
    ...options,
  });
}
