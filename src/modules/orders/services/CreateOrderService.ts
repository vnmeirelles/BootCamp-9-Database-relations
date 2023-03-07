import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IProductCreate {
  product_id: string;
  price: number;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer does not exists!');
    }

    const productsStorage = await this.productsRepository.findAllById(products);

    if (!productsStorage || products.length !== productsStorage.length) {
      throw new AppError('Some product does not exist!');
    }

    const orderProducts: IProductCreate[] = [];

    productsStorage.forEach(productStorage => {
      const productIndex = products.findIndex(
        product => product.id === productStorage.id,
      );

      if (productStorage.quantity < products[productIndex].quantity) {
        throw new AppError(
          'Product does not have sufficient quantity in stock!',
        );
      }

      orderProducts.push({
        product_id: productStorage.id,
        price: productStorage.price,
        quantity: products[productIndex].quantity,
      });
    });

    const order = await this.ordersRepository.create({
      customer,
      products: orderProducts,
    });

    await this.productsRepository.updateQuantity(products);

    return order;
  }
}

export default CreateOrderService;
