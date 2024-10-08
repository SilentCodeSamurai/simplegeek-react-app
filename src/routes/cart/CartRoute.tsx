import { ShoppingCart } from "@mui/icons-material";
import { Divider, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { CountPageHeader } from "@components/CountPageHeader";
import { Empty } from "@components/Empty";
import { UserCartItem } from "@appTypes/UserItems";
import { useEffect, useMemo, useState } from "react";

import { CartSection } from "./CartSection";

import SuggestedItems from "@components/SuggestedItems";
import { useSelector } from "react-redux";
import { RootState } from "@state/store";
import { useGetCatalogQuery, useGetItemsAvailabilityQuery } from "@api/shop/catalog";
import { useGetCartItemListQuery } from "@api/shop/cart";
import { useGetFavoriteItemListQuery } from "@api/shop/favorites";
import { useCheckoutMutation } from "@api/shop/order";
import { Loading } from "@components/Loading";
import { formCart } from "./utils";
import { useIsMobile } from "src/hooks/useIsMobile";

export function Component() {
	const navigate = useNavigate();

	const isMobile = useIsMobile();
	const userAuthority = useSelector((state: RootState) => state.userAuthority.authority);

	const { data: catalog, isLoading: catalogIsLoading } = useGetCatalogQuery();
	const { data: availableItemsIds, isLoading: availableItemsIdsIsLoading } = useGetItemsAvailabilityQuery();

	const { data: cartItemList, isLoading: cartItemListIsLoading } = useGetCartItemListQuery();
	const { data: favoriteItemList, isLoading: favoriteItemListIsLoading } = useGetFavoriteItemListQuery();

	const [checkout, { isSuccess: checkoutIsSuccess, isError: checkoutIsError }] = useCheckoutMutation();

	const [orderIsOk, setOrderIsOk] = useState(true);

	const showLoading =
		catalogIsLoading || availableItemsIdsIsLoading || cartItemListIsLoading || favoriteItemListIsLoading;

	useEffect(() => {
		if (checkoutIsSuccess) {
			navigate("/order");
		}
		if (checkoutIsError) {
			setOrderIsOk(false);
		}
	}, [checkoutIsSuccess, navigate, checkoutIsError]);

	const formedCart = useMemo(
		() =>
			catalog && availableItemsIds && cartItemList
				? formCart({ catalogItems: catalog.items, userCart: cartItemList.items, availableItemsIds })
				: { sections: [] },
		[catalog, availableItemsIds, cartItemList]
	);

	const createOrder = async (items: UserCartItem[]) => {
		if (!userAuthority) {
			navigate("/auth/login?return_to=cart");
		} else {
			checkout({ items });
		}
	};

	return (
		<>
			<CountPageHeader isMobile={isMobile} title="Корзина" count={cartItemList?.items.length || 0} />
			<Loading
				isLoading={showLoading}
				necessaryDataIsPersisted={!!catalog && !!availableItemsIds && !!cartItemList && !!favoriteItemList}
			>
				<>
					{!orderIsOk && (
						<div className="bg-primary p-3 w-100 br-3">
							<Typography variant="body2">
								В вашем заказе содержались товары, указанное количество которых отсутствует на складе.
								Количество товаров в корзине было скорректировано
							</Typography>
						</div>
					)}
					<Stack direction={"column"} gap={4} divider={<Divider />} p={"24px 0"}>
						{formedCart.sections.map((section) => {
							const userSectionItems =
								cartItemList?.items.filter((item) =>
									section.items.some((sectionItem) => sectionItem.id === item.id)
								) || [];
							return (
								userSectionItems.length > 0 && (
									<CartSection
										isMobile={isMobile}
										key={section.title}
										data={section}
										onMakeOrder={createOrder}
									/>
								)
							);
						})}
					</Stack>
					{cartItemList?.items.length === 0 && (
						<Empty
							title="В корзине ничего нет"
							description="Добавьте в корзину что-нибудь"
							icon={
								<ShoppingCart
									sx={{
										width: 91,
										height: 91,
										color: "icon.tertiary",
									}}
								/>
							}
						/>
					)}
					<SuggestedItems />
				</>
			</Loading>
		</>
	);
}
