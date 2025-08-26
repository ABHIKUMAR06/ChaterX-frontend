import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function withAuth(WrappedComponent: React.FC) {
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
