#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include <string.h>

typedef enum{
	dom,
	seg,
	ter,
	qua,
	qui,
	sex,
	sab,
}DIAS;

bool comparar(char *dia, DIAS atual){
	if (!strcmp(dia,"DOM")){
		if (atual == dom) return true;
		else return false;
	}
	if (!strcmp(dia,"SEG")){
		if (atual == seg) return true;
		else return false;
	}
	if (!strcmp(dia,"TER")){
		if (atual == ter) return true;
		else return false;
	}
	if (!strcmp(dia,"QUA")){
		if (atual == qua) return true;
		else return false;
	}
	if (!strcmp(dia,"QUI")){
		if (atual == qui) return true;
		else return false;
	}
	if (!strcmp(dia,"SEX")){
		if (atual == sex) return true;
		else return false;
	}
	if (!strcmp(dia,"SAB")){
		if (atual == sab) return true;
		else return false;
	}
	else return false;
}

DIAS ano_inicio(int ano){
	return (DIAS)(ano + (ano-1)/4 - (ano-1)/100 + (ano-1)/400) % 7;
}

bool ano_bissexto(int ano){
	if (ano % 400 == 0) return true;
	else if (ano % 100 == 0) return false;
	return (ano % 4 == 0);
}

void imprimir_dia(FILE *f, DIAS dia){
	switch(dia){
		case dom: fprintf(f,"DOM,"); break;
		case seg: fprintf(f,"SEG,"); break;
		case ter: fprintf(f,"TER,"); break;
		case qua: fprintf(f,"QUA,"); break;
		case qui: fprintf(f,"QUI,"); break;
		case sex: fprintf(f,"SEX,"); break;
		case sab: fprintf(f,"SAB,"); break;
	}
}

DIAS dia_atual(int dia, int ano){
	DIAS inicio_ano = ano_inicio(ano);
	return (DIAS)(inicio_ano + (dia- 1)) % 7;
}

void imprimir_data(FILE *f, int dia, int ano){
	int mes = 1;
	DIAS atual = dia_atual(dia,ano);
	int bissexto;
	if (ano_bissexto(ano))
		bissexto = 1;
	else bissexto = 0;
	
	while (dia >= 0){
		// excluir janeiro
		if (dia > 31 && mes == 1){
			dia -= 31;
			mes++;
			continue;
		}
		// excluir fevereiro
		if (bissexto && mes == 2){
			if (dia > 29){
				dia -= 29;
				mes++;
				continue;
			}
		}
		else if (mes == 2){
			if (dia > 28){
				dia -= 28;
				mes++;
				continue;;
			}
		}
		// escluir marco
		if (dia > 31 && mes == 3){
			dia -= 31;
			mes++;
			continue;
		}
		// excluir abril
		if (dia > 30 && mes == 4){
			dia -= 30;
			mes++;
			continue;
		}
		// excluir maio
		if (dia > 31 && mes == 5){
			dia -= 31;
			mes++;
			continue;
		}
		// excluir junho
		if (dia > 30 && mes == 6){
			dia -= 30;
			mes++;
			continue;
		}
		// excluir julho
		if (dia > 31 && mes == 7){
			dia -= 31;
			mes++;
			continue;
		}
		// excluir agosto
		if (dia > 31 && mes == 8){
			dia -= 31;
			mes++;
			continue;
		}
		// excluir setembro
		if (dia > 30 && mes == 9){
			dia -= 30;
			mes++;
			continue;
		}
		// excluir outubro
		if (dia > 31 && mes == 10){
			dia -= 31;
			mes++;
			continue;
		}
		// excluir novembro
		if (dia > 30 && mes == 11){
			dia -= 30;
			mes++;
			continue;
		}
		// excluir dezembro
		if (mes == 12){
			break;
		}
		else break;
	}
	
	imprimir_dia(f,atual);
	fprintf(f,"%02d/%02d/%d,",dia,mes,ano);
}

void ler_str(char *str){
	scanf("%s",str);
}

int main(void){
	int dias;
	printf("Digite o número de dias: ");
	scanf("%d",&dias);
	char vet[dias][50];
	for (int i = 0; i<dias; i++){
		printf("Digite o nome do dia %d: ",i);
		ler_str(vet[i]);
	}
	int organistas;
	printf("Digite o número de organistas: ");
	scanf("%d",&organistas);
	char nomes[organistas][50];
	for (int i = 0; i<organistas; i++){
		printf("Digite o nome da organista %d: ",i+1);
		ler_str(nomes[i]);
	}
	
	int passo = organistas/dias;
	if (passo == 0) passo = 1;
	// criar a matriz
	char *matriz[dias][organistas];
	for (int i = 0; i<dias; i++){
		for (int j = 0; j<organistas; j++){
			matriz[i][j] = nomes[(j-passo*i+organistas)%organistas];
		}
	}
	printf("Insira o ano atual: ");
	int ano;
	scanf("%d",&ano);
	// salvar no arquivo
	FILE *f = fopen("rodizio.csv","w");
	if (f == NULL){
		printf("Erro ao salvar o arquivo!\n");
		exit(1);
	}
	int dia = 0;
	// com a matriz criada, salvar em um vetor
	int max = (ano_bissexto(ano)) ? 366 : 365;
	// cabecalho
	fprintf(f,"Dia    ,Data    ,Organista    \n");
	while (dia <= max){
		for (int i = 0; i<organistas; i++){
			for (int j = 0; j<dias; j++){
				// encontrar o dia
				dia++;
				while (comparar(vet[j],dia_atual(dia,ano)) == false){
					dia++;
				}
				if (dia > max) break;
				imprimir_data(f,dia,ano);
				fprintf(f,"%s,\n",matriz[j][i]);
			}
		}
	}
	printf("Arquivo criado com sucesso!\n");

	fclose(f);
	return 0;
}
