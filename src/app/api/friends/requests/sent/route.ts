// src/app/api/friends/requests/sent/route.ts
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'يجب تسجيل الدخول أولاً' },
        { status: 401 }
      )
    }

    const requests = await prisma.friendRequest.findMany({
      where: {
        senderId: session.user.id,
        status: 'PENDING'
      },
      include: {
        receiver: {
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
      message: 'تم جلب الطلبات المرسلة بنجاح',
      requests,
      count: requests.length
    }, { status: 200 })

  } catch (error) {
    console.error('Get sent requests error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب الطلبات المرسلة' },
      { status: 500 }
    )
  }
}
