import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function Auth(WrappedComponent: React.FC) {
  return function ProtectedComponent(props: any) {
    const router = useRouter();

    useEffect(() => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.replace("/login");
      }
    }, [router]);


    return <WrappedComponent {...props} />;
  };
}
