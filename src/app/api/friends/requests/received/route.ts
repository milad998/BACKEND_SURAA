// src/app/api/friends/requests/received/route.ts
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'يجب تسجيل الدخول أولاً' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'PENDING'

    const requests = await prisma.friendRequest.findMany({
      where: {
        receiverId: session.user.id,
        status: status as any
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            status: true,
            lastSeen: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      message: 'تم جلب طلبات الصداقة بنجاح',
      requests,
      count: requests.length
    }, { status: 200 })

  } catch (error) {
    console.error('Get friend requests error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب طلبات الصداقة' },
      { status: 500 }
    )
  }
}
