import { ChevronLeft, Close } from "@mui/icons-material";
import {
	Box,
	Button,
	Checkbox,
	CircularProgress,
	Divider,
	FormControlLabel,
	IconButton,
	Modal,
	Stack,
	TextField,
	Typography,
} from "@mui/material";
import { useNavigate, useSubmit } from "react-router-dom";

import { getRuGoodsWord } from "@utils/format";
import { useEffect, useMemo, useState } from "react";
import { getImageUrl } from "@utils/image";
import { CreditInfoGet } from "@appTypes/Credit";
import { DeliveryPackage, DeliveryPoint, DeliveryService, Recipient } from "@appTypes/Delivery";
import { ShopOrderItemCard, ShopOrderItemCardCredit } from "@components/ItemCard";
import { useGetCatalogQuery } from "@api/shop/catalog";
import { useCreateOrderMutation, useGetCheckoutItemsQuery } from "@api/shop/order";
import { useIsMobile } from "src/hooks/useIsMobile";
import { z } from "zod";
import { CDEKDeliveryData } from "@appTypes/CDEK";
import { useGetSavedDeliveryQuery } from "@api/shop/profile";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DeliverySchema } from "@schemas/Delivery";
import { CDEKDeliveryInfo, CDEKWidget } from "@components/widgets/cdek";
import { CardRadio } from "@components/CardRadio";

import cdekLogo from "@assets/SdekLogo.png";
import mainLogoSmall from "@assets/MainLogoSmall.png";
import SomethingWentWrong from "@components/SomethingWentWrong";

type DeliveryFormData = {
	recipient: Recipient;
	service: DeliveryService | null;
	point: DeliveryPoint | null;
	cdekDeliveryData: CDEKDeliveryData | null;
};

const DeliveryFormResolver = z
	.object({
		recipient: z.object({
			fullName: z.string({ message: "Укажите ФИО" }).min(2, "ФИО должно быть не менее 2 символов"),
			phone: z
				.string({ message: "Укажите номер телефона" })
				.regex(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/, {
					message: "Неверный номер телефона",
				})
				.min(10, "Номер телефона должен быть не менее 10 символов"),
		}),
		service: z.enum(["SELF_PICKUP", "CDEK"], { message: "Укажите способ доставки" }),
		point: z
			.object({
				address: z.string(),
				code: z.string(),
			})
			.nullable(),
	})
	.refine(
		(data) => {
			if (data.service === "CDEK") {
				return data.point !== null;
			}
			return true;
		},
		{
			message: "Укажите адрес доставки",
			path: ["point"],
		}
	);

export function Component() {
	const isMobile = useIsMobile();
	const submit = useSubmit();
	const navigate = useNavigate();

	const { data: catalog, isLoading: catalogIsLoading } = useGetCatalogQuery();
	const { data: checkoutItemList, isLoading: checkoutItemListIsLoading } = useGetCheckoutItemsQuery(void 0, {
		refetchOnMountOrArgChange: true,
	});
	const { data: userSavedDelivery, isLoading: userSavedDeliveryIsLoading } = useGetSavedDeliveryQuery();
	const [
		createOrder,
		{
			isLoading: orderMakeIsLoading,
			isSuccess: orderMakeIsSuccess,
			data: orderMakeSuccessData,
			isError: orderMakeIsError,
			error: orderMakeError,
		},
	] = useCreateOrderMutation();

	const {
		control,
		watch,
		setValue,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<DeliveryFormData>({
		resolver: zodResolver(DeliveryFormResolver),
		defaultValues: {
			recipient: {
				fullName: "",
				phone: "",
			},
			point: null,
			service: null,
			cdekDeliveryData: null,
		},
	});

	useEffect(() => {
		if (userSavedDelivery) {
			reset({
				recipient: userSavedDelivery.recipient,
				service: userSavedDelivery.service,
				point: userSavedDelivery.point,
				cdekDeliveryData: null,
			});
		} else {
			reset({
				recipient: {
					fullName: "",
					phone: "",
				},
				service: null,
				point: null,
				cdekDeliveryData: null,
			});
		}
	}, [userSavedDelivery, reset]);

	const service = watch("service");
	const cdekDeliveryData = watch("cdekDeliveryData");

	const [cdekWidgetOpen, setCdekWidgetOpen] = useState(false);

	const [saveDelivery, setSaveDelivery] = useState(true);

	useEffect(() => {
		if (userSavedDelivery) {
			setSaveDelivery(false);
		}
	}, [userSavedDelivery])

	const handleChooseCdekAddress = (data: CDEKDeliveryData) => {
		setValue("cdekDeliveryData", data);
		setValue("point", {
			code: data.address.code,
			address: `${data.address.city}, ${data.address.address}`,
		});
		setCdekWidgetOpen(false);
	};

	useEffect(() => {
		if (!checkoutItemListIsLoading && (!checkoutItemList || checkoutItemList.items.length === 0)) {
			navigate("/cart");
		}
	}, [checkoutItemList, checkoutItemListIsLoading, navigate]);

	useEffect(() => {
		if (orderMakeIsSuccess) {
			const paymentUrl = orderMakeSuccessData.paymentUrl;
			window.location.href = paymentUrl;
		}
	}, [orderMakeIsSuccess, orderMakeSuccessData]);

	useEffect(() => {
		if (orderMakeIsError) {
			console.error(orderMakeError);
			submit({ orderItemsUnavailableError: true }, { action: "/cart", method: "post" });
		}
	}, [orderMakeIsError, orderMakeError, submit]);

	const orderItems = useMemo(() => {
		if (!catalog) return [];
		return (
			checkoutItemList?.items.map((item) => {
				const catalogItem = catalog.items.find((catalogItem) => catalogItem.id === item.id);
				if (!catalogItem) {
					throw new Response("Catalog item not found", { status: 404 });
				}
				return { ...catalogItem, quantity: item.quantity };
			}) || []
		);
	}, [catalog, checkoutItemList]);

	const packages: DeliveryPackage[] = useMemo(() => {
		const packages: DeliveryPackage[] = [];
		for (const item of orderItems) {
			if (!item.product.physicalProperties) continue;
			for (let i = 0; i < item.quantity; i++) {
				packages.push(item.product.physicalProperties);
			}
		}
		return packages;
	}, [orderItems]);

	const itemsCreditAvailable = useMemo(() => orderItems.filter((item) => item.creditInfo !== null), [orderItems]);
	const itemsCreditUnavailable = useMemo(() => orderItems.filter((item) => item.creditInfo === null), [orderItems]);

	const preorder = useMemo(() => orderItems.at(0)?.preorder || null, [orderItems]);

	const [creditItemsIds, setCreditItemIts] = useState<Set<string>>(new Set());

	const totalPrice = useMemo(
		() =>
			orderItems
				.map((orderItem) => {
					if (creditItemsIds.has(orderItem.id)) {
						return (orderItem.creditInfo?.payments[0].sum || 0) * orderItem.quantity;
					} else {
						console.log({ id: orderItem.id, price: orderItem.price, quantity: orderItem.quantity });
						return orderItem.price * orderItem.quantity;
					}
				})
				.reduce((a, b) => a + b, 0),
		[orderItems, creditItemsIds]
	);

	const totalDiscount = orderItems
		.map((cartItem) => (cartItem.discount ?? 0) * cartItem.quantity)
		.reduce((a, b) => a + b, 0);

	const handleStockCreateOrder = async (data: DeliveryFormData) => {
		const delivery = DeliverySchema.parse(data);
		createOrder({
			creditIds: Array.from(creditItemsIds),
			delivery,
			saveDelivery,
		});
	};

	const handleCreatePreorderOrder = () => {
		createOrder({
			creditIds: Array.from(creditItemsIds),
			delivery: null,
			saveDelivery: false,
		});
	};

	return (
		<>
			{catalogIsLoading || checkoutItemListIsLoading || userSavedDeliveryIsLoading ? (
				<div className="w-100 h-100 ai-c d-f jc-c">
					<CircularProgress />
				</div>
			) : !catalog || !checkoutItemList ? (
				<SomethingWentWrong />
			) : (
				<>
					<Modal
						open={cdekWidgetOpen}
						onClose={() => setCdekWidgetOpen(false)}
						aria-labelledby="cdek-widget-title"
						aria-describedby="cdek-widget-description"
						keepMounted={false}
						sx={{ justifyContent: "center", alignItems: "center", padding: 3 }}
					>
						<Box
							position={"relative"}
							width={"100%"}
							height={"100%"}
							bgcolor={"white"}
							borderRadius={3}
							padding={2}
							boxShadow={24}
						>
							<IconButton
								sx={{
									zIndex: 10000,
									width: 48,
									height: 48,
									position: "absolute",
									top: 0,
									right: 0,
								}}
								onClick={() => setCdekWidgetOpen(false)}
							>
								<Close sx={{ width: 40, height: 40 }} />
							</IconButton>

							<CDEKWidget
								onCalculate={(tariffs, address) => {
									console.log("%cCalculate function", "color: yellow", {
										tariffs: tariffs,
										address: address,
									});
								}}
								onChoose={(deliveryType, tariff, address) => {
									handleChooseCdekAddress({ deliveryType, tariff, address });
								}}
								onReady={() => {}}
								packages={packages}
							/>
						</Box>
					</Modal>
					<Box display={"flex"} flexDirection={"column"} alignItems={"flex-start"} gap={2}>
						<Button variant="text" sx={{ color: "warning.main" }} onClick={() => navigate(-1)}>
							<ChevronLeft />
							<Typography color="inherit">Назад в корзину</Typography>
						</Button>

						<Box padding={"16px 0"}>
							<Typography variant={isMobile ? "h4" : "h3"}>Оформление заказа</Typography>
						</Box>

						<form
							onSubmit={handleSubmit(handleStockCreateOrder)}
							className="gap-2 w-100 d-f"
							style={{ flexDirection: isMobile ? "column" : "row" }}
						>
							<Box display={"flex"} flexDirection={"column"} gap={2} width={"100%"}>
								{preorder === null ? (
									<div className="section">
										<div className="gap-2 d-f fd-c">
											<Typography variant={"h5"}>
												{isMobile ? "Доставка" : "Адрес и способ доставки"}{" "}
											</Typography>
											<Box>
												<CardRadio
													isChecked={service === "SELF_PICKUP"}
													onChange={() => setValue("service", "SELF_PICKUP")}
													mainText={"Самовывоз"}
													subText={"Оплата при получении"}
													imgUrl={mainLogoSmall}
												/>

												<CardRadio
													isChecked={service === "CDEK"}
													onChange={() => setValue("service", "CDEK")}
													mainText={"СДЭК"}
													subText={"Оплата доставки при получении"}
													imgUrl={cdekLogo}
												/>
											</Box>

											{service === "SELF_PICKUP" && (
												<Box display={"flex"} flexDirection={"column"} gap={"8px"}>
													<Typography variant="h6">Самовывоз</Typography>
												</Box>
											)}

											{service === "CDEK" && (
												<Box display={"flex"} flexDirection={"column"} gap={"8px"}>
													{cdekDeliveryData ? (
														<CDEKDeliveryInfo {...cdekDeliveryData} />
													) : (
														<Typography variant="h6">Адрес не выбран</Typography>
													)}

													<Button
														variant="text"
														color="warning"
														size="medium"
														sx={{ width: "fit-content", padding: 0, color: "warning.main" }}
														onClick={() => setCdekWidgetOpen(true)}
													>
														{cdekDeliveryData ? "Изменить" : "Выбрать"}
													</Button>
												</Box>
											)}
											{errors.service && (
												<Typography color="error" variant="body1">
													{errors.service.message}
												</Typography>
											)}
											{errors.point && (
												<Typography color="error" variant="body1">
													{errors.point.message}
												</Typography>
											)}
										</div>

										<div>
											<Typography variant="h5">Получатель</Typography>
											<div
												className="gap-1 ai-c d-f"
												style={{ flexDirection: isMobile ? "column" : "row" }}
											>
												<Controller
													name="recipient.phone"
													control={control}
													render={({ field, fieldState: { error } }) => (
														<TextField
															{...field}
															label="Номер телефона"
															variant="outlined"
															fullWidth
															margin="normal"
															error={!!error}
															helperText={error?.message}
														/>
													)}
												/>

												<Controller
													name="recipient.fullName"
													control={control}
													render={({ field, fieldState: { error } }) => (
														<TextField
															{...field}
															label="ФИО"
															variant="outlined"
															fullWidth
															margin="normal"
															error={!!error}
															helperText={error?.message}
														/>
													)}
												/>
											</div>
										</div>

										<FormControlLabel
											control={
												<Checkbox
													checked={saveDelivery}
													onChange={(e) => setSaveDelivery(e.target.checked)}
												/>
											}
											label="Сохранить адрес доставки"
										/>
									</div>
								) : (
									<div className="section">
										<Typography variant="h5">Доставка и дата получения на склад</Typography>
										<Box gap={"8px"}>
											<Typography variant="subtitle1">
												Доставка к вам оформляется после полной оплаты товара и его приезда на
												склад
											</Typography>
											<Box display={"flex"} flexDirection={"row"} gap={"8px"}>
												<Typography color="typography.secondary" variant="subtitle1">
													На складе ожидается:
												</Typography>
												<Typography variant="subtitle1">
													{preorder.expectedArrival ?? "Неизвестно"}
												</Typography>
											</Box>
										</Box>
									</div>
								)}

								<Typography variant="h5">
									{orderItems.length} {getRuGoodsWord(orderItems.length)}
								</Typography>

								{itemsCreditUnavailable.map((item) => (
									<div className="section">
										<ShopOrderItemCard
											key={item.id}
											imgUrl={getImageUrl(item.product.images.at(0)?.url ?? "", "small")}
											title={item.product.title}
											price={item.price}
											quantity={item.quantity}
										/>
									</div>
								))}
								{itemsCreditAvailable.map((item) => (
									<div className="section">
										<ShopOrderItemCardCredit
											key={item.id}
											imgUrl={getImageUrl(item.product.images.at(0)?.url ?? "", "small")}
											title={item.product.title}
											price={item.price}
											quantity={item.quantity}
											creditInfo={item.creditInfo as CreditInfoGet}
											isCredit={creditItemsIds.has(item.id)}
											onCreditChange={(isCredit) => {
												const newItemsCredit = new Set(creditItemsIds);
												if (isCredit) {
													newItemsCredit.add(item.id);
												} else {
													newItemsCredit.delete(item.id);
												}
												setCreditItemIts(newItemsCredit);
											}}
										/>
									</div>
								))}
							</Box>
							<Box
								position={"sticky"}
								top={8}
								display="flex"
								flexDirection="column"
								flexShrink={0}
								gap={2} // assuming the theme's spacing unit is 8px, otherwise adjust accordingly
								p={2}
								bgcolor="white"
								borderRadius={3}
								width={isMobile ? "100%" : 360}
								height="fit-content"
							>
								<Box display="flex" flexDirection="column" gap={1}>
									{totalDiscount > 0 ? (
										<Stack direction={"column"} gap={1} divider={<Divider flexItem />}>
											<div className="d-f fd-r jc-sb" style={{ alignItems: "baseline" }}>
												<Typography variant="body1">Цена без скидки:</Typography>
												<Typography variant="h6" sx={{ color: "typography.secondary" }}>
													{totalPrice} ₽
												</Typography>
											</div>
											<div className="d-f fd-r jc-sb" style={{ alignItems: "baseline" }}>
												<Typography variant="body1">Скидка:</Typography>
												<Typography variant="h6" color="warning">
													{totalDiscount} ₽
												</Typography>
											</div>
											<div className="d-f fd-r jc-sb" style={{ alignItems: "baseline" }}>
												<Typography variant="body1">Итого:</Typography>
												<Typography variant="h6">{totalPrice - totalDiscount} ₽</Typography>
											</div>
										</Stack>
									) : (
										<div className="d-f fd-r jc-sb" style={{ alignItems: "baseline" }}>
											<Typography variant="body1">Итого:</Typography>
											<Typography variant="h6">{totalPrice} ₽</Typography>
										</div>
									)}
									{preorder ? (
										<Button
											variant="contained"
											disabled={orderMakeIsLoading}
											onClick={handleCreatePreorderOrder}
										>
											Оплатить
										</Button>
									) : (
										<Button variant="contained" disabled={orderMakeIsLoading} type="submit">
											Оплатить
										</Button>
									)}
								</Box>
							</Box>
						</form>
					</Box>
				</>
			)}
		</>
	);
}
