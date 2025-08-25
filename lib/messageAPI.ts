export async function fetchMessage(chatId:string) {
    const token = localStorage.getItem("token")
    
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/message/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message);
    }

    return await res.json();
}