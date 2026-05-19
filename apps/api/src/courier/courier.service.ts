import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

const STEADFAST_BASE = 'https://portal.packzy.com/api/v1';

@Injectable()
export class CourierService {
  constructor(private prisma: PrismaService) { }

  private async getSteadfastClient() {
    const settings = await this.prisma.siteSetting.findFirst();
    const courier = settings?.courierSettings as any;

    if (!courier?.token || !courier?.apiSecret) {
      throw new BadRequestException(
        'Steadfast API credentials are not configured. Go to Admin → Settings → Courier Integration.',
      );
    }

    return axios.create({
      baseURL: STEADFAST_BASE,
      headers: {
        'Api-Key': courier.token,
        'Secret-Key': courier.apiSecret,
        'Content-Type': 'application/json',
      },
    });
  }

  async getBalance() {
    const client = await this.getSteadfastClient();
    const { data } = await client.get('/get_balance');
    return data;
  }

  async bookOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.trackingCode) {
      throw new BadRequestException(`Already booked. Tracking: ${order.trackingCode}`);
    }

    const client = await this.getSteadfastClient();
    const itemDesc = (order.items as any[]).map((i) => `${i.productName} x${i.quantity}`).join(', ');

    // Steadfast requires exactly 11 digits starting with 01
    let phone = order.customerPhone.replace(/[^0-9]/g, '');
    if (phone.startsWith('8801')) phone = phone.substring(2);
    if (!phone.startsWith('01') || phone.length !== 11) {
      throw new BadRequestException(`Steadfast requires an 11-digit phone number starting with 01. Provided: ${order.customerPhone}`);
    }

    let sfResponse: any;
    try {
      const { data } = await client.post('/create_order', {
        invoice: (order as any).orderNumber,
        recipient_name: order.customerName,
        recipient_phone: phone,
        recipient_address: order.address,
        cod_amount: order.total,
        note: order.note || '',
        item_description: itemDesc,
      });
      sfResponse = data;
    } catch (err: any) {
      const sfError = err?.response?.data;
      const errorMsg = sfError?.message || 'Steadfast API error';
      const validationErrors = sfError?.errors ? JSON.stringify(sfError.errors) : '';
      throw new BadRequestException(`${errorMsg} ${validationErrors}`.trim());
    }

    if (sfResponse?.status !== 200 || !sfResponse?.consignment) {
      throw new BadRequestException(sfResponse?.message || 'Failed to create Steadfast consignment');
    }

    const c = sfResponse.consignment;
    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { trackingCode: c.tracking_code, consignmentId: c.consignment_id, courierStatus: c.status },
    });

    return { message: 'Booked successfully', tracking_code: c.tracking_code, consignment_id: c.consignment_id, status: c.status, order: updated };
  }

  async refreshStatus(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (!order.consignmentId) throw new BadRequestException('Not booked with Steadfast yet');

    const client = await this.getSteadfastClient();
    const { data } = await client.get(`/status_by_cid/${order.consignmentId}`);
    const newStatus = data?.delivery_status || order.courierStatus;
    const updated = await this.prisma.order.update({ where: { id: orderId }, data: { courierStatus: newStatus } });
    return { delivery_status: newStatus, order: updated };
  }

  async checkStatusByTracking(trackingCode: string) {
    const client = await this.getSteadfastClient();
    const { data } = await client.get(`/status_by_trackingcode/${trackingCode}`);
    return data;
  }

  async createReturnRequest(orderId: string, reason?: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order?.consignmentId) throw new BadRequestException('No Steadfast consignment to return');
    const client = await this.getSteadfastClient();
    const { data } = await client.post('/create_return_request', { consignment_id: order.consignmentId, reason: reason || '' });
    return data;
  }

  async getReturnRequests() {
    const client = await this.getSteadfastClient();
    const { data } = await client.get('/get_return_requests');
    return data;
  }

  async getPayments() {
    const client = await this.getSteadfastClient();
    const { data } = await client.get('/payments');
    return data;
  }

  async getPoliceStations() {
    const client = await this.getSteadfastClient();
    const { data } = await client.get('/police_stations');
    return data;
  }

  async getBookedOrders() {
    return this.prisma.order.findMany({
      where: { consignmentId: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, orderNumber: true, customerName: true, customerPhone: true, total: true, trackingCode: true, consignmentId: true, courierStatus: true, createdAt: true },
    });
  }
}
