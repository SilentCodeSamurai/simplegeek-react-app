import { Box, Button, Grid2, IconButton, Modal, TextField, Typography } from "@mui/material";
import { CDEKDeliveryInfo, CDEKWidget } from "./widgets/cdek";
import { Controller, useForm } from "react-hook-form";
import { Delivery, DeliveryPackage, DeliveryPoint, DeliveryService, Recipient } from "@appTypes/Delivery";

import { CDEKDeliveryData } from "@appTypes/CDEK";
import { CardRadio } from "./CardRadio";
import { Close } from "@mui/icons-material";
import cdekLogo from "@assets/SdekLogo.png";
import mainLogoSmall from "@assets/MainLogoSmall.png";
import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { DeliverySchema } from "@schemas/Delivery";

type DeliveryFormData = {
	recipient: Recipient;
	service: DeliveryService | null;
	point: DeliveryPoint | null;
	cdekDeliveryData: CDEKDeliveryData | null;
};

const DeliveryFormResolver = z
	.object({
		recipient: z.object({
			email: z.string({ message: "Укажите почту" }).regex(/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/, "Невалидная почта"),
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

interface DeliveryFormProps {
	delivery?: Delivery;
	onChange: (data: z.infer<typeof DeliverySchema>) => void;
	packages: DeliveryPackage[];
	isMobile?: boolean;
}

const DeliveryForm: React.FC<DeliveryFormProps> = ({ packages, onChange, delivery, isMobile }) => {
	const {
		control,
		watch,
		setValue,
		handleSubmit,
		reset,
		formState: { isDirty, errors },
	} = useForm<DeliveryFormData>({
		resolver: zodResolver(DeliveryFormResolver),
		defaultValues: delivery
			? {
					recipient: delivery.recipient,
					service: delivery.service,
					point: delivery.point,
					cdekDeliveryData: null,
			  }
			: {
					recipient: {
						fullName: "",
						phone: "",
					},
					point: null,
					service: null,
					cdekDeliveryData: null,
			  },
	});

	const service = watch("service");
	const cdekDeliveryData = watch("cdekDeliveryData");

	const [isEditing, setIsEditing] = useState(!delivery);
	const [cdekWidgetOpen, setCdekWidgetOpen] = useState(false);

	const handleSave = (data: DeliveryFormData) => {
		onChange(DeliverySchema.parse(data));
		setIsEditing(false);
		reset(DeliverySchema.parse(data));
	};

	const handleStopEditing = () => {
		reset();
		setIsEditing(false);
	};

	const handleChooseCdekAddress = (data: CDEKDeliveryData) => {
		setValue("cdekDeliveryData", data);
		setCdekWidgetOpen(false);
	};

	return (
		<>
			<Modal
				open={cdekWidgetOpen && isEditing}
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
						sx={{ zIndex: 10000, width: 48, height: 48, position: "absolute", top: 0, right: 0 }}
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
						// TODO: mass vs weight
						packages={packages.map((pkg) => ({
							width: pkg.width,
							height: pkg.height,
							length: pkg.length,
							weight: pkg.mass,
						}))}
					/>
				</Box>
			</Modal>
			<form className="section" onSubmit={handleSubmit(handleSave)}>
				<div className="gap-2 d-f fd-c">
					<Typography variant={"h5"}>{isMobile ? "Доставка" : "Адрес и способ доставки"} </Typography>
					<Box>
						<CardRadio
							isChecked={service === "SELF_PICKUP"}
							disabled={!isEditing}
							onChange={() => setValue("service", "SELF_PICKUP")}
							mainText={"Самовывоз"}
							subText={"Оплата при получении"}
							imgUrl={mainLogoSmall}
						/>

						<CardRadio
							isChecked={service === "CDEK"}
							disabled={!isEditing}
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
							{isEditing && (
								<Button
									variant="text"
									color="warning"
									size="medium"
									sx={{ width: "fit-content", padding: 0, color: "warning.main" }}
									onClick={() => setCdekWidgetOpen(true)}
								>
									{cdekDeliveryData ? "Изменить" : "Выбрать"}
								</Button>
							)}
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
					<Grid2 container spacing={2}>
						<Grid2 size={{ xs: 12, sm: 12, md: 6 }}>
							<Controller
								name="recipient.email"
								disabled={!isEditing}
								control={control}
								render={({ field, fieldState: { error } }) => (
									<TextField
										{...field}
										label="Электронная почта"
										variant="outlined"
										fullWidth
										margin="normal"
										error={!!error}
										helperText={error?.message}
									/>
								)}
							/>
						</Grid2>
						<Grid2 size={{ xs: 12, sm: 12, md: 6 }}>
							<Controller
								name="recipient.phone"
								disabled={!isEditing}
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
						</Grid2>
						<Grid2 size={{ xs: 12, sm: 12, md: 6 }}>
							<Controller
								name="recipient.fullName"
								control={control}
								disabled={!isEditing}
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
						</Grid2>
					</Grid2>
				</div>

				{isEditing ? (
					<div className="gap-2 d-f fd-r">
						<Button
							sx={{ width: "max-content" }}
							disabled={!isDirty}
							type="submit"
							variant="contained"
							color="success"
						>
							{!delivery ? "Подтвердить" : "Сохранить"}
						</Button>
						{delivery && (
							<Button
								sx={{ width: "max-content" }}
								onClick={handleStopEditing}
								variant="contained"
								color="error"
							>
								Отменить
							</Button>
						)}
					</div>
				) : (
					<>
						<Button
							sx={{ width: "max-content" }}
							onClick={() => setIsEditing(true)}
							variant="contained"
							color="primary"
						>
							Изменить
						</Button>
					</>
				)}
			</form>
		</>
	);
};

export { DeliveryForm };
